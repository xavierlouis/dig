// src/store/useGameStore.ts
'use client';

import { create } from 'zustand';
import type {
  Account, DigResult, JackpotState, LevelId, RoundState, TierName,
} from '@/services/types';
import { ECONOMY } from '@/config/economy';
import { TIER_ORDER } from '@/lib/game/economy';

export type GameModal = 'deposit' | 'withdraw' | null;

export interface SessionStats {
  digs: number;
  wagered: number; // lamports
  won: number;     // lamports, instant payouts + jackpot SOL share
  jackpotValueSol: number;
  tiers: Record<TierName, number>;
  best: TierName | null;
}

interface GameState {
  // Wallet
  walletConnected: boolean;
  walletAddress: string | null;
  balance: number; // wallet SOL

  // Ledger account (credit lives here)
  account: Account | null;

  // Jackpot crypt bag
  jackpot: JackpotState | null;

  // Level session
  level: LevelId | null;
  round: RoundState | null;
  roundNumber: number;
  sessionStats: SessionStats;

  // UI
  modal: GameModal;
  soundEnabled: boolean;

  // Actions
  connectWallet: (address: string, balance: number) => void;
  disconnectWallet: () => void;
  setBalance: (balance: number) => void;
  setAccount: (account: Account | null) => void;
  setCredit: (lamports: number) => void;
  setJackpot: (jackpot: JackpotState) => void;
  startLevel: (level: LevelId) => void;
  nextRound: () => void;
  updateTomb: (index: number, dig: DigResult) => void;
  recordDig: (dig: DigResult) => void;
  endLevel: () => void;
  openModal: (modal: Exclude<GameModal, null>) => void;
  closeModal: () => void;
  toggleSound: () => void;
}

function emptyStats(): SessionStats {
  return {
    digs: 0,
    wagered: 0,
    won: 0,
    jackpotValueSol: 0,
    tiers: { dust: 0, bone: 0, coffin: 0, zombie: 0, resurrect: 0 },
    best: null,
  };
}

function newRound(level: LevelId, n: number): RoundState {
  return {
    id: `round-${n}-${Date.now()}`,
    level,
    tombs: Array.from({ length: ECONOMY.TOMBS_PER_ROUND }, (_, index) => ({ index, status: 'sealed' as const })),
  };
}

export const useGameStore = create<GameState>((set) => ({
  walletConnected: false,
  walletAddress: null,
  balance: 0,
  account: null,
  jackpot: null,
  level: null,
  round: null,
  roundNumber: 0,
  sessionStats: emptyStats(),
  modal: null,
  soundEnabled: true,

  connectWallet: (address, balance) =>
    set({ walletConnected: true, walletAddress: address, balance }),

  disconnectWallet: () =>
    set({ walletConnected: false, walletAddress: null, balance: 0, account: null }),

  setBalance: (balance) => set({ balance }),

  setAccount: (account) => set({ account }),

  setCredit: (credit) =>
    set((s) => (s.account ? { account: { ...s.account, credit } } : {})),

  setJackpot: (jackpot) => set({ jackpot }),

  startLevel: (level) =>
    set({ level, round: newRound(level, 1), roundNumber: 1, sessionStats: emptyStats() }),

  nextRound: () =>
    set((s) => (s.level ? { round: newRound(s.level, s.roundNumber + 1), roundNumber: s.roundNumber + 1 } : {})),

  updateTomb: (index, dig) =>
    set((s) => {
      if (!s.round) return {};
      const tombs = s.round.tombs.map((t) =>
        t.index === index ? { ...t, status: 'opened' as const, dig } : t,
      );
      return { round: { ...s.round, tombs } };
    }),

  recordDig: (dig) =>
    set((s) => {
      const st = s.sessionStats;
      const jackpotSol = dig.jackpot?.shares.find((h) => h.asset === 'SOL')?.amount ?? 0;
      const best =
        st.best === null || TIER_ORDER.indexOf(dig.tier) > TIER_ORDER.indexOf(st.best) ? dig.tier : st.best;
      return {
        sessionStats: {
          digs: st.digs + 1,
          wagered: st.wagered + dig.wager,
          won: st.won + dig.payout + jackpotSol,
          jackpotValueSol: st.jackpotValueSol + (dig.jackpot?.valueSol ?? 0),
          tiers: { ...st.tiers, [dig.tier]: st.tiers[dig.tier] + 1 },
          best,
        },
      };
    }),

  endLevel: () => set({ level: null, round: null, roundNumber: 0 }),

  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),

  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
}));
