import { describe, expect, it } from 'vitest';
import { SOL_ASSET, bagValueSol, splitBag } from '../jackpot';
import { formatSol } from '../economy';
import { isoWeekId, weekIndex } from '../week';

describe('splitBag', () => {
  it('gives the winner 80% of every holding and keeps 20% as the next seed', () => {
    const { winner, remaining } = splitBag({ [SOL_ASSET]: 1_000_000_000, rugcat: 48_213_775_000_000 });
    expect(winner[SOL_ASSET]).toBe(800_000_000);
    expect(remaining[SOL_ASSET]).toBe(200_000_000);
    expect(winner.rugcat + remaining.rugcat).toBe(48_213_775_000_000);
    expect(winner.rugcat).toBe(38_571_020_000_000);
  });

  it('floors the winner share and never loses units', () => {
    const { winner, remaining } = splitBag({ odd: 7 });
    expect(winner.odd).toBe(5);
    expect(remaining.odd).toBe(2);
  });
});

describe('bagValueSol', () => {
  it('values tokens at their price and counts unpriced tokens as 0', () => {
    const holdings = { [SOL_ASSET]: 500_000_000, a: 2_000_000, dead: 9_000_000 };
    const value = bagValueSol(
      holdings,
      (asset) => (asset === 'a' ? 1.5 : null),
      (asset) => (asset === SOL_ASSET ? 9 : 6),
    );
    expect(value).toBeCloseTo(0.5 + 2 * 1.5, 10);
  });
});

describe('formatSol', () => {
  it('keeps two decimals and trims extra zeros', () => {
    expect(formatSol(840_000_000)).toBe('0.84');
    expect(formatSol(20_000_000)).toBe('0.02');
    expect(formatSol(5_000_000)).toBe('0.005');
    expect(formatSol(1_000_000_000)).toBe('1.00');
    expect(formatSol(100_000_000)).toBe('0.10');
  });
});

describe('weeks', () => {
  it('uses ISO week ids', () => {
    expect(isoWeekId(new Date('2026-09-28T00:00:00Z'))).toBe('2026-W40');
    expect(isoWeekId(new Date('2021-01-03T12:00:00Z'))).toBe('2020-W53');
  });

  it('rolls over on Monday 00:00 UTC', () => {
    const sunday = weekIndex(new Date('2026-09-27T23:59:59Z'));
    const monday = weekIndex(new Date('2026-09-28T00:00:00Z'));
    expect(monday).toBe(sunday + 1);
  });
});
