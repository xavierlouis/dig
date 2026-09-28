// src/lib/game/economy.ts
// Pure economy math shared by the mock, the server and the debug simulation.

import { ECONOMY, LAMPORTS_PER_SOL } from '@/config/economy';
import type { LevelId, TierName } from '@/services/types';

export const TIER_ORDER: TierName[] = ['dust', 'bone', 'coffin', 'zombie', 'resurrect'];

const PPM = 1_000_000;

export function priceOf(level: LevelId): number {
  return ECONOMY.LEVELS[level].priceLamports;
}

/** Resurrect odds scale with the dig price: equal jackpot chance per SOL wagered at every level. */
export function resurrectPpm(level: LevelId): number {
  return Math.round((priceOf(level) * ECONOMY.JACKPOT.HIT_PPM_PER_SOL) / LAMPORTS_PER_SOL);
}

/** Instant payout for a tier, in lamports. Resurrect pays from the jackpot, not here. */
export function payoutFor(tier: TierName, level: LevelId): number {
  if (tier === 'dust' || tier === 'resurrect') return 0;
  return Math.floor((priceOf(level) * ECONOMY.TIERS[tier].payoutX100) / 100);
}

/** Share of a wager that goes into the jackpot crypt bag. */
export function jackpotContribution(level: LevelId): number {
  return Math.floor((priceOf(level) * ECONOMY.JACKPOT.SPLIT_BPS) / 10_000);
}

export function tierOddsPpm(level: LevelId): Record<TierName, number> {
  const resurrect = resurrectPpm(level);
  const { bone, coffin, zombie } = ECONOMY.TIERS;
  return {
    dust: PPM - resurrect - zombie.oddsPpm - coffin.oddsPpm - bone.oddsPpm,
    bone: bone.oddsPpm,
    coffin: coffin.oddsPpm,
    zombie: zombie.oddsPpm,
    resurrect,
  };
}

/** Expected instant payout as a fraction of the wager (0.70 with the current table). */
export function expectedInstantPayoutRate(): number {
  return Object.values(ECONOMY.TIERS).reduce(
    (sum, t) => sum + (t.oddsPpm / PPM) * (t.payoutX100 / 100),
    0,
  );
}

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): number {
  return Math.round(sol * LAMPORTS_PER_SOL);
}

/** "0.84", "0.02", "0.005": at least 2 decimals, up to maxDigits, trailing zeros trimmed. */
export function formatSol(lamports: number, maxDigits = 3): string {
  const fixed = lamportsToSol(lamports).toFixed(maxDigits);
  return fixed.replace(/(\.\d\d\d*?)0+$/, '$1');
}
