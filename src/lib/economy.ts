// src/lib/economy.ts

import type { LevelId, TierName } from '@/services/types';
import { ECONOMY, getLevelConfig, getTierConfig } from '@/config/economy';

/** Calculate how an item purchase splits into different pools */
export function calculateSplits(level: LevelId) {
  const price = getLevelConfig(level).price;
  return {
    prizePool: price * ECONOMY.SPLITS.PRIZE_POOL,
    tokenBuy: price * ECONOMY.SPLITS.TOKEN_BUY,
    treasury: price * ECONOMY.SPLITS.TREASURY,
    jackpot: price * ECONOMY.SPLITS.JACKPOT,
  };
}

/** Calculate the SOL payout for a tier at a given level */
export function calculateSolPayout(tier: TierName, level: LevelId): number {
  const tierConfig = getTierConfig(tier);
  const levelConfig = getLevelConfig(level);
  return tierConfig.solPayout * levelConfig.rewardMultiplier;
}

/** Calculate the token payout (in SOL equivalent) for a tier at a given level */
export function calculateTokenPayout(tier: TierName, level: LevelId): number {
  const tierConfig = getTierConfig(tier);
  const levelConfig = getLevelConfig(level);
  return tierConfig.tokenPayout * levelConfig.rewardMultiplier;
}

/** Calculate resurrect jackpot payout */
export function calculateJackpotPayout(currentJackpot: number): number {
  return currentJackpot * ECONOMY.JACKPOT.PAYOUT_PERCENT;
}

/** Calculate Option B premium over Option A */
export function calculateOptionBValue(solPayout: number): number {
  return solPayout * ECONOMY.OPTION_B_PREMIUM;
}

/** Estimate expected value per item at a level */
export function calculateExpectedValue(level: LevelId): number {
  let ev = 0;
  const tiers = Object.entries(ECONOMY.TIERS) as [TierName, typeof ECONOMY.TIERS[TierName]][];
  for (const [tierName, config] of tiers) {
    if (tierName === 'resurrect') continue; // jackpot is variable
    const payout = calculateSolPayout(tierName, level);
    ev += config.odds * payout;
  }
  // Per item: 3 tombs
  return ev * ECONOMY.DIGS_PER_PACK;
}

/** Calculate house edge for a level */
export function calculateHouseEdge(level: LevelId): number {
  const price = getLevelConfig(level).price;
  const ev = calculateExpectedValue(level);
  return (price - ev) / price;
}
