import { describe, expect, it } from 'vitest';
import { resolveDig, resolveTier } from '../resolve';
import {
  expectedInstantPayoutRate, jackpotContribution, payoutFor, priceOf, resurrectPpm, tierOddsPpm,
} from '../economy';
import type { TierName } from '@/services/types';

/** Deterministic PRNG so the statistical test can't flake. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('economy', () => {
  it('pays multiples of the dig price, in exact lamports', () => {
    expect(priceOf('shallow_grave')).toBe(20_000_000);
    expect(payoutFor('dust', 'shallow_grave')).toBe(0);
    expect(payoutFor('bone', 'shallow_grave')).toBe(10_000_000);   // 0.01 SOL
    expect(payoutFor('coffin', 'shallow_grave')).toBe(40_000_000); // 0.04 SOL
    expect(payoutFor('zombie', 'shallow_grave')).toBe(200_000_000); // 0.20 SOL
    expect(payoutFor('resurrect', 'shallow_grave')).toBe(0);       // paid from the jackpot
    expect(payoutFor('zombie', 'ancient_vault')).toBe(1_500_000_000);
  });

  it('scales Resurrect odds with the dig price (1% per SOL)', () => {
    expect(resurrectPpm('shallow_grave')).toBe(200);  // 1 in 5,000
    expect(resurrectPpm('deep_crypt')).toBe(500);     // 1 in 2,000
    expect(resurrectPpm('ancient_vault')).toBe(1500); // 1 in 667
  });

  it('has odds that sum to one million ppm at every level', () => {
    for (const level of ['shallow_grave', 'deep_crypt', 'ancient_vault'] as const) {
      const sum = Object.values(tierOddsPpm(level)).reduce((a, b) => a + b, 0);
      expect(sum).toBe(1_000_000);
    }
  });

  it('returns 70% instantly and sends 20% of each wager to the jackpot', () => {
    expect(expectedInstantPayoutRate()).toBeCloseTo(0.7, 10);
    expect(jackpotContribution('shallow_grave')).toBe(4_000_000);
  });
});

describe('resolveTier', () => {
  it('resolves in fixed order at the exact boundaries', () => {
    const lvl = 'shallow_grave';
    const at = (ppm: number) => resolveTier(ppm / 1_000_000, lvl);
    expect(at(0)).toBe('resurrect');
    expect(at(199.999)).toBe('resurrect');
    expect(at(200)).toBe('zombie');
    expect(at(40_199.999)).toBe('zombie');
    expect(at(40_200)).toBe('coffin');
    expect(at(140_200)).toBe('bone');
    expect(at(340_199.999)).toBe('bone');
    expect(at(340_200)).toBe('dust');
    expect(resolveTier(0.999999, lvl)).toBe('dust');
  });

  it('rejects rolls outside [0, 1)', () => {
    expect(() => resolveTier(1, 'shallow_grave')).toThrow();
    expect(() => resolveTier(-0.1, 'shallow_grave')).toThrow();
    expect(() => resolveTier(Number.NaN, 'shallow_grave')).toThrow();
  });
});

describe('1M simulated digs', () => {
  it('hits the configured frequencies and a 70% instant payout rate', () => {
    const N = 1_000_000;
    const rand = mulberry32(0xd16);
    const counts: Record<TierName, number> = { dust: 0, bone: 0, coffin: 0, zombie: 0, resurrect: 0 };
    let paid = 0;
    for (let i = 0; i < N; i++) {
      const { tier, payout } = resolveDig(rand(), 'shallow_grave');
      counts[tier]++;
      paid += payout;
    }
    const odds = tierOddsPpm('shallow_grave');
    for (const tier of Object.keys(counts) as TierName[]) {
      const expected = odds[tier] / 1_000_000;
      // within 5 standard deviations of a binomial proportion
      const tolerance = 5 * Math.sqrt((expected * (1 - expected)) / N);
      expect(Math.abs(counts[tier] / N - expected)).toBeLessThan(tolerance);
    }
    expect(paid / (N * priceOf('shallow_grave'))).toBeCloseTo(0.7, 2);
  });
});
