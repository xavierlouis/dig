// src/config/economy.ts
// Source of truth for the credit-model economy. See documentation/CREDIT_LEDGER_PLAN.md §2.
// Money is integer lamports (JS numbers are exact up to ~9M SOL).

import type { LevelId, ItemType } from '@/services/types';

export const LAMPORTS_PER_SOL = 1_000_000_000;

interface LevelConfig {
  item: ItemType;
  priceLamports: number; // per dig
  locked: boolean;
}

/** Instant tiers. Dust is the remainder; Resurrect odds scale with the dig price. */
type InstantTier = 'bone' | 'coffin' | 'zombie';

interface TierConfig {
  oddsPpm: number;    // parts per million
  payoutX100: number; // payout as a multiple of the dig price, ×100
}

export const ECONOMY = {
  LEVELS: {
    shallow_grave: { item: 'pickaxe', priceLamports: 20_000_000, locked: false },
    deep_crypt:    { item: 'lamp',    priceLamports: 50_000_000, locked: true },
    ancient_vault: { item: 'key',     priceLamports: 150_000_000, locked: true },
  } satisfies Record<LevelId, LevelConfig>,

  TOMBS_PER_ROUND: 3, // visual only

  TIERS: {
    bone:   { oddsPpm: 200_000, payoutX100: 50 },
    coffin: { oddsPpm: 100_000, payoutX100: 200 },
    zombie: { oddsPpm: 40_000,  payoutX100: 1000 },
  } satisfies Record<InstantTier, TierConfig>,

  JACKPOT: {
    HIT_PPM_PER_SOL: 10_000,     // 1% per SOL of dig price → Shallow 200 ppm (1 in 5,000)
    SPLIT_BPS: 2_000,            // 20% of each wager goes to the crypt bag
    WINNER_SHARE_BPS: 8_000,     // winner takes 80% of every holding, 20% seeds the next jackpot
    LAUNCH_SEED_LAMPORTS: 1_000_000_000, // 1 SOL house seed
  },

  HOUSE_SPLIT_BPS: 1_000, // 10%

  DEPOSIT: {
    MIN_LAMPORTS: 50_000_000,
    PRESETS_SOL: [0.1, 0.25, 0.5, 1],
  },

  WITHDRAW: {
    MIN_LAMPORTS: 10_000_000,
    AUTO_MAX_LAMPORTS: 5_000_000_000,
    DAILY_AUTO_MAX_LAMPORTS: 20_000_000_000,
  },
} as const;

export function getLevelConfig(level: LevelId) {
  return ECONOMY.LEVELS[level];
}

export function getItemForLevel(level: LevelId): ItemType {
  return ECONOMY.LEVELS[level].item;
}
