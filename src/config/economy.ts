// src/config/economy.ts

import type { LevelId, ItemType, TierName } from '@/services/types';

interface LevelConfig {
  item: ItemType;
  price: number; // in SOL
  rewardMultiplier: number;
}

interface TierConfig {
  odds: number;
  solPayout: number;
  tokenPayout: number;
  hasChoice: boolean;
}

export const ECONOMY = {
  LEVELS: {
    shallow_grave: { item: 'pickaxe', price: 0.06, rewardMultiplier: 1 },
    deep_crypt:    { item: 'lamp',    price: 0.15, rewardMultiplier: 3 },
    ancient_vault: { item: 'key',     price: 0.50, rewardMultiplier: 10 },
  } satisfies Record<LevelId, LevelConfig>,

  DIGS_PER_PACK: 3,

  SPLITS: {
    PRIZE_POOL: 0.60,
    TOKEN_BUY: 0.20,
    TREASURY: 0.15,
    JACKPOT: 0.05,
  },

  TIERS: {
    dust:      { odds: 0.65,  solPayout: 0,     tokenPayout: 0,    hasChoice: false },
    bone:      { odds: 0.20,  solPayout: 0.005, tokenPayout: 0,    hasChoice: false },
    coffin:    { odds: 0.10,  solPayout: 0.03,  tokenPayout: 0.04, hasChoice: true  },
    zombie:    { odds: 0.045, solPayout: 0.10,  tokenPayout: 0.14, hasChoice: true  },
    resurrect: { odds: 0.005, solPayout: 0,     tokenPayout: 0,    hasChoice: true  },
    // Resurrect payout = JACKPOT.PAYOUT_PERCENT * current jackpot
  } satisfies Record<TierName, TierConfig>,

  JACKPOT: {
    SEED: 1.0,
    PAYOUT_PERCENT: 0.50,
  },

  OPTION_B_PREMIUM: 1.33,
} as const;

/** Get level config by LevelId */
export function getLevelConfig(level: LevelId) {
  return ECONOMY.LEVELS[level];
}

/** Get tier config by TierName */
export function getTierConfig(tier: TierName) {
  return ECONOMY.TIERS[tier];
}

/** Get item type for a level */
export function getItemForLevel(level: LevelId): ItemType {
  return ECONOMY.LEVELS[level].item;
}

/** Get level ID from item type */
export function getLevelForItem(item: ItemType): LevelId {
  const entry = Object.entries(ECONOMY.LEVELS).find(([, cfg]) => cfg.item === item);
  return entry![0] as LevelId;
}
