// src/lib/game/jackpot.ts
// Crypt bag math: the jackpot is a set of holdings (tokens + unconverted SOL).

import { ECONOMY } from '@/config/economy';

export const SOL_ASSET = 'SOL';

export type Holdings = Record<string, number>; // asset → raw amount

/** Winner takes WINNER_SHARE_BPS of every holding (floored); the rest stays as the next seed. */
export function splitBag(holdings: Holdings, winnerBps: number = ECONOMY.JACKPOT.WINNER_SHARE_BPS) {
  const winner: Holdings = {};
  const remaining: Holdings = {};
  for (const [asset, amount] of Object.entries(holdings)) {
    const share = Math.floor((amount * winnerBps) / 10_000);
    if (share > 0) winner[asset] = share;
    if (amount - share > 0) remaining[asset] = amount - share;
  }
  return { winner, remaining };
}

/**
 * Value of the bag in SOL. `priceSol` is the TWAP per whole token, or null when the token has no price.
 * Tokens without a price count as 0.
 */
export function bagValueSol(
  holdings: Holdings,
  priceSol: (asset: string) => number | null,
  decimals: (asset: string) => number,
): number {
  let total = 0;
  for (const [asset, amount] of Object.entries(holdings)) {
    if (asset === SOL_ASSET) {
      total += amount / 10 ** decimals(asset);
      continue;
    }
    const price = priceSol(asset);
    if (price !== null) total += (amount / 10 ** decimals(asset)) * price;
  }
  return total;
}
