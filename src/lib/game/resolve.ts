// src/lib/game/resolve.ts
// Roll → tier. One roll, fixed order: Resurrect first, then Zombie, Coffin, Bone; the rest is Dust.

import type { LevelId, TierName } from '@/services/types';
import { payoutFor, tierOddsPpm } from './economy';

const RESOLVE_ORDER: TierName[] = ['resurrect', 'zombie', 'coffin', 'bone'];

export function resolveTier(roll: number, level: LevelId): TierName {
  if (!(roll >= 0 && roll < 1)) throw new Error(`Roll out of range: ${roll}`);
  const odds = tierOddsPpm(level);
  const ppm = roll * 1_000_000;
  let cumulative = 0;
  for (const tier of RESOLVE_ORDER) {
    cumulative += odds[tier];
    if (ppm < cumulative) return tier;
  }
  return 'dust';
}

export function resolveDig(roll: number, level: LevelId): { tier: TierName; payout: number } {
  const tier = resolveTier(roll, level);
  return { tier, payout: payoutFor(tier, level) };
}
