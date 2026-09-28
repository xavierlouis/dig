// src/services/mock/mockGameService.ts
// The whole game in the browser: ledger, provably fair rolls, crypt-bag jackpot with a
// simulated DCA. Uses the same pure code as the server (lib/game/*), so odds and payouts match.
// State persists in localStorage. Debug controls live in `mockDebug` (mock bundle only).

import type { IGameService } from '../interfaces';
import type {
  Account, DigResult, JackpotHolding, JackpotState, JackpotWin, SeedRotation, TierName, Withdrawal,
} from '../types';
import { GameError } from '../errors';
import { ECONOMY } from '@/config/economy';
import { getTokenById } from '@/config/tokens';
import { getTokenForWeek } from '@/config/weekly';
import { hashServerSeed, hmacRoll, randomHex } from '@/lib/game/fair';
import { jackpotContribution, payoutFor, priceOf } from '@/lib/game/economy';
import { resolveDig } from '@/lib/game/resolve';
import { SOL_ASSET, bagValueSol, splitBag, type Holdings } from '@/lib/game/jackpot';
import { weekIdForIndex, weekIndex } from '@/lib/game/week';
import {
  MOCK_FULL_ADDRESS, mockWalletCredit, mockWalletDebit, mockWalletReset, mockWalletService,
} from './mockWalletService';

const STORAGE_KEY = 'dig_mock_state_v1';
const TOKEN_DECIMALS = 6;
const SOL_DECIMALS = 9;
const MAX_DIG_HISTORY = 500;

// Simulated DCA (CREDIT_LEDGER_PLAN.md §7.2, sped up for testing)
const DCA_INTERVAL_MS = 30_000;
const DCA_SKIP_CHANCE = 0.3;
const DCA_MAX_SLICE_LAMPORTS = 250_000_000;
const DCA_MIN_SLICE_LAMPORTS = 1_000_000;
const DCA_PRICE_IMPACT = 0.005; // each slice nudges the price up 0.5%
const PRICE_DRIFT = 0.03;       // random walk per tick, ±3%

export interface MockDigRecord extends DigResult {
  createdAt: number;
  clientSeed: string;
  serverSeedHash: string;
}

interface MockState {
  version: 1;
  signedIn: boolean;
  credit: number;
  clientSeed: string;
  serverSeed: string;
  serverSeedHash: string;
  nonce: number;
  revealedSeeds: { serverSeed: string; serverSeedHash: string }[];
  jackpot: {
    holdings: Holdings;
    prices: Record<string, number | null>; // SOL per whole token; null = no price (crashed)
    weekOffset: number;
    spentByWeek: Record<string, number>;
    growingSince: number;
  };
  digs: MockDigRecord[]; // oldest first
}

interface DebugFlags {
  forceNextTier: TierName | null;
  slowNetwork: boolean;
  failNextDeposit: boolean;
}

const flags: DebugFlags = { forceNextTier: null, slowNetwork: false, failNextDeposit: false };
const listeners = new Set<() => void>();
const recentDigs = new Map<string, DigResult>(); // requestId → result (idempotency)

let statePromise: Promise<MockState> | null = null;
let queue: Promise<unknown> = Promise.resolve();
let ticker: ReturnType<typeof setInterval> | null = null;

// ── State ──────────────────────────────────────────────────────────────

async function freshState(): Promise<MockState> {
  const serverSeed = randomHex(32);
  return {
    version: 1,
    signedIn: false,
    credit: 0,
    clientSeed: randomHex(8),
    serverSeed,
    serverSeedHash: await hashServerSeed(serverSeed),
    nonce: 0,
    revealedSeeds: [],
    jackpot: {
      holdings: { [SOL_ASSET]: ECONOMY.JACKPOT.LAUNCH_SEED_LAMPORTS },
      prices: {},
      weekOffset: 0,
      spentByWeek: {},
      growingSince: Date.now(),
    },
    digs: [],
  };
}

function loadState(): Promise<MockState> {
  if (!statePromise) {
    statePromise = (async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as MockState;
          if (parsed.version === 1) return parsed;
        }
      } catch {
        // storage unavailable or corrupt — start fresh
      }
      return freshState();
    })();
    ensureTicker();
  }
  return statePromise;
}

function save(state: MockState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  listeners.forEach((fn) => fn());
}

/** Serialise every state change so concurrent calls can't reuse a nonce. */
function exclusive<T>(fn: (state: MockState) => Promise<T>): Promise<T> {
  const run = queue.then(async () => fn(await loadState()));
  queue = run.catch(() => undefined);
  return run;
}

function latency(baseMs = 100, jitterMs = 200) {
  const ms = flags.slowNetwork ? 2000 : baseMs + Math.random() * jitterMs;
  return new Promise((r) => setTimeout(r, ms));
}

function requireSignedIn(state: MockState) {
  if (!state.signedIn) throw new GameError('NOT_SIGNED_IN', 'Connect your wallet first.');
}

function toAccount(state: MockState): Account {
  return {
    wallet: MOCK_FULL_ADDRESS,
    credit: state.credit,
    serverSeedHash: state.serverSeedHash,
    clientSeed: state.clientSeed,
    nonce: state.nonce,
  };
}

// ── Jackpot helpers ────────────────────────────────────────────────────

function currentWeek(state: MockState) {
  const index = weekIndex() + state.jackpot.weekOffset;
  return { weekId: weekIdForIndex(index), token: getTokenForWeek(index) };
}

function priceOfAsset(state: MockState, asset: string): number | null {
  if (asset in state.jackpot.prices) return state.jackpot.prices[asset];
  return getTokenById(asset)?.currentPrice ?? null;
}

function decimalsOf(asset: string) {
  return asset === SOL_ASSET ? SOL_DECIMALS : TOKEN_DECIMALS;
}

function describeHoldings(state: MockState, holdings: Holdings): JackpotHolding[] {
  const list = Object.entries(holdings).map(([asset, amount]): JackpotHolding => {
    const decimals = decimalsOf(asset);
    if (asset === SOL_ASSET) {
      return { asset, symbol: 'SOL', amount, decimals, valueSol: amount / 10 ** decimals };
    }
    const price = priceOfAsset(state, asset);
    return {
      asset,
      symbol: getTokenById(asset)?.name ?? asset,
      amount,
      decimals,
      valueSol: price === null ? null : (amount / 10 ** decimals) * price,
    };
  });
  // Tokens by value, SOL last
  return list.sort((a, b) => {
    if (a.asset === SOL_ASSET) return 1;
    if (b.asset === SOL_ASSET) return -1;
    return (b.valueSol ?? -1) - (a.valueSol ?? -1);
  });
}

function bagValue(state: MockState, holdings: Holdings) {
  return bagValueSol(holdings, (a) => priceOfAsset(state, a), decimalsOf);
}

/** One simulated DCA slice: spend SOL from the bag on the current week's token. */
function dcaSlice(state: MockState, allowSkip: boolean): boolean {
  const { holdings, prices, spentByWeek } = state.jackpot;

  // Every tick, token prices drift a little (crashed tokens stay at null)
  for (const asset of Object.keys(holdings)) {
    if (asset === SOL_ASSET) continue;
    const p = priceOfAsset(state, asset);
    if (p !== null) prices[asset] = p * (1 + (Math.random() * 2 - 1) * PRICE_DRIFT);
  }

  if (allowSkip && Math.random() < DCA_SKIP_CHANCE) return false;

  const sol = holdings[SOL_ASSET] ?? 0;
  if (sol < DCA_MIN_SLICE_LAMPORTS) return false;

  const { weekId, token } = currentWeek(state);
  const price = priceOfAsset(state, token.id);
  if (price === null || price <= 0) return false; // no route: SOL stays in the bag

  const slice = Math.min(sol, Math.floor(DCA_MAX_SLICE_LAMPORTS * (0.7 + Math.random() * 0.6)));
  const tokensRaw = Math.floor((slice / 10 ** SOL_DECIMALS / price) * 10 ** TOKEN_DECIMALS);
  if (tokensRaw <= 0) return false;

  holdings[SOL_ASSET] = sol - slice;
  if (holdings[SOL_ASSET] === 0) delete holdings[SOL_ASSET];
  holdings[token.id] = (holdings[token.id] ?? 0) + tokensRaw;
  prices[token.id] = price * (1 + DCA_PRICE_IMPACT);
  spentByWeek[weekId] = (spentByWeek[weekId] ?? 0) + slice;
  return true;
}

function ensureTicker() {
  if (ticker || typeof window === 'undefined') return;
  ticker = setInterval(() => {
    void exclusive(async (state) => {
      dcaSlice(state, true);
      save(state);
    });
  }, DCA_INTERVAL_MS);
}

// ── Service ────────────────────────────────────────────────────────────

export const mockGameService: IGameService = {
  signIn() {
    return exclusive(async (state) => {
      if (!mockWalletService.isConnected()) throw new GameError('NOT_SIGNED_IN', 'Connect your wallet first.');
      state.signedIn = true;
      save(state);
      return toAccount(state);
    });
  },

  signOut() {
    return exclusive(async (state) => {
      state.signedIn = false;
      save(state);
    });
  },

  async getAccount() {
    const state = await loadState();
    return state.signedIn ? toAccount(state) : null;
  },

  async getWalletBalance() {
    return mockWalletService.getBalance();
  },

  deposit(lamports) {
    return exclusive(async (state) => {
      requireSignedIn(state);
      await latency(900, 300); // "waiting for the graveyard to confirm"
      if (lamports < ECONOMY.DEPOSIT.MIN_LAMPORTS) {
        throw new GameError('BELOW_MINIMUM', 'Below the minimum deposit.');
      }
      if (flags.failNextDeposit) {
        flags.failNextDeposit = false;
        throw new GameError('REJECTED', 'Deposit rejected (simulated failure).');
      }
      if (!mockWalletDebit(lamports)) {
        throw new GameError('INSUFFICIENT_WALLET', 'Not enough SOL in your wallet.');
      }
      state.credit += lamports;
      save(state);
      return toAccount(state);
    });
  },

  dig(level, requestId) {
    return exclusive(async (state) => {
      requireSignedIn(state);
      const cached = recentDigs.get(requestId);
      if (cached) return cached;

      await latency();
      if (ECONOMY.LEVELS[level].locked) throw new GameError('LEVEL_LOCKED', 'This level is still sealed.');
      const price = priceOf(level);
      if (state.credit < price) throw new GameError('INSUFFICIENT_CREDIT', 'Not enough credit for this dig.');

      const nonce = state.nonce;
      const roll = await hmacRoll(state.serverSeed, state.clientSeed, nonce);
      let { tier, payout } = resolveDig(roll, level);
      const forced = flags.forceNextTier !== null;
      if (flags.forceNextTier) {
        tier = flags.forceNextTier;
        payout = payoutFor(tier, level);
        flags.forceNextTier = null;
      }

      state.credit += payout - price;
      state.nonce += 1;
      const { holdings } = state.jackpot;
      holdings[SOL_ASSET] = (holdings[SOL_ASSET] ?? 0) + jackpotContribution(level);

      let jackpot: JackpotWin | undefined;
      if (tier === 'resurrect') {
        const { winner, remaining } = splitBag(holdings);
        jackpot = { shares: describeHoldings(state, winner), valueSol: bagValue(state, winner) };
        state.credit += winner[SOL_ASSET] ?? 0; // the SOL share lands straight in credit
        state.jackpot.holdings = remaining;
        state.jackpot.growingSince = Date.now();
      }

      const result: DigResult = {
        id: randomHex(8),
        level,
        tier,
        wager: price,
        payout,
        nonce,
        roll,
        ...(forced ? { forced: true } : {}),
        credit: state.credit,
        ...(jackpot ? { jackpot } : {}),
      };

      state.digs.push({ ...result, createdAt: Date.now(), clientSeed: state.clientSeed, serverSeedHash: state.serverSeedHash });
      if (state.digs.length > MAX_DIG_HISTORY) state.digs.splice(0, state.digs.length - MAX_DIG_HISTORY);
      recentDigs.set(requestId, result);
      if (recentDigs.size > 50) recentDigs.delete(recentDigs.keys().next().value!);

      save(state);
      return result;
    });
  },

  withdraw(lamports) {
    return exclusive(async (state) => {
      requireSignedIn(state);
      await latency(900, 300);
      if (lamports < ECONOMY.WITHDRAW.MIN_LAMPORTS) {
        throw new GameError('BELOW_MINIMUM', 'Below the minimum withdrawal.');
      }
      if (lamports > state.credit) throw new GameError('INSUFFICIENT_CREDIT', 'Not enough credit.');

      state.credit -= lamports;
      const review = lamports > ECONOMY.WITHDRAW.AUTO_MAX_LAMPORTS;
      if (!review) mockWalletCredit(lamports);
      const withdrawal: Withdrawal = { id: randomHex(8), lamports, status: review ? 'review' : 'confirmed' };
      save(state);
      return { withdrawal, account: toAccount(state) };
    });
  },

  rotateSeed(clientSeed) {
    return exclusive(async (state): Promise<SeedRotation> => {
      const revealed = { serverSeed: state.serverSeed, serverSeedHash: state.serverSeedHash };
      state.revealedSeeds.push(revealed);
      state.serverSeed = randomHex(32);
      state.serverSeedHash = await hashServerSeed(state.serverSeed);
      state.nonce = 0;
      if (clientSeed) state.clientSeed = clientSeed;
      save(state);
      return { revealedServerSeed: revealed.serverSeed, newServerSeedHash: state.serverSeedHash };
    });
  },

  async getJackpot(): Promise<JackpotState> {
    const state = await loadState();
    const { weekId, token } = currentWeek(state);
    return {
      valueSol: bagValue(state, state.jackpot.holdings),
      holdings: describeHoldings(state, state.jackpot.holdings),
      buyingNow: { weekId, token, solSpentThisWeek: state.jackpot.spentByWeek[weekId] ?? 0 },
      growingSince: state.jackpot.growingSince,
    };
  },
};

// ── Debug controls (mock only) ─────────────────────────────────────────

export interface MockSnapshot {
  credit: number;
  walletLamports: number;
  nonce: number;
  weekId: string;
  weekOffset: number;
  tokenName: string;
  holdings: JackpotHolding[];
  digs: MockDigRecord[];
  flags: DebugFlags;
}

export const mockDebug = {
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },

  async snapshot(): Promise<MockSnapshot> {
    const state = await loadState();
    const { weekId, token } = currentWeek(state);
    return {
      credit: state.credit,
      walletLamports: mockWalletService.getBalance(),
      nonce: state.nonce,
      weekId,
      weekOffset: state.jackpot.weekOffset,
      tokenName: token.name,
      holdings: describeHoldings(state, state.jackpot.holdings),
      digs: state.digs,
      flags: { ...flags },
    };
  },

  setForceNextTier(tier: TierName | null) {
    flags.forceNextTier = tier;
    listeners.forEach((fn) => fn());
  },

  setSlowNetwork(on: boolean) {
    flags.slowNetwork = on;
    listeners.forEach((fn) => fn());
  },

  failNextDeposit() {
    flags.failNextDeposit = true;
    listeners.forEach((fn) => fn());
  },

  addCredit(lamports: number) {
    return exclusive(async (state) => {
      state.credit = Math.max(0, state.credit + lamports);
      save(state);
    });
  },

  runDcaNow() {
    return exclusive(async (state) => {
      dcaSlice(state, false);
      save(state);
    });
  },

  /** Jump to the next week: the vault starts buying the next roster token; unwon tokens stay. */
  skipWeek() {
    return exclusive(async (state) => {
      state.jackpot.weekOffset += 1;
      save(state);
    });
  },

  /** Simulate a token dying again: no price, shown as "≈ ?", still paid out. */
  crashToken(asset: string) {
    return exclusive(async (state) => {
      state.jackpot.prices[asset] = null;
      save(state);
    });
  },

  reset() {
    return exclusive(async () => {
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      mockWalletReset();
      recentDigs.clear();
      flags.forceNextTier = null;
      flags.slowNetwork = false;
      flags.failNextDeposit = false;
      const fresh = await freshState();
      fresh.signedIn = mockWalletService.isConnected();
      statePromise = Promise.resolve(fresh);
      save(fresh);
    });
  },
};

