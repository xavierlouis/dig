import { createHash, createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { hashServerSeed, hmacRoll, macToRoll, randomHex, verifyRoll } from '../fair';

const SEED = '9f2c4e7a1b3d5f60718293a4b5c6d7e8f90112233445566778899aabbccddeef';

/** Independent reference implementation with node:crypto. */
function referenceRoll(seedHex: string, clientSeed: string, nonce: number): number {
  const mac = createHmac('sha256', Buffer.from(seedHex, 'hex')).update(`${clientSeed}:${nonce}`).digest();
  return macToRoll(new Uint8Array(mac));
}

describe('macToRoll', () => {
  it('maps the first 52 bits into [0, 1)', () => {
    expect(macToRoll(new Uint8Array(32))).toBe(0);
    const max = macToRoll(new Uint8Array(32).fill(0xff));
    expect(max).toBe((2 ** 52 - 1) / 2 ** 52);
    expect(max).toBeLessThan(1);
    const half = new Uint8Array(32);
    half[0] = 0x80;
    expect(macToRoll(half)).toBe(0.5);
  });
});

describe('hmacRoll', () => {
  it('matches a node:crypto reference implementation', async () => {
    for (const [client, nonce] of [['abc', 0], ['abc', 1], ['player-seed', 42], ['', 999_999]] as const) {
      expect(await hmacRoll(SEED, client, nonce)).toBe(referenceRoll(SEED, client, nonce));
    }
  });

  it('is deterministic and changes with the nonce', async () => {
    const a = await hmacRoll(SEED, 'c', 7);
    expect(await hmacRoll(SEED, 'c', 7)).toBe(a);
    expect(await hmacRoll(SEED, 'c', 8)).not.toBe(a);
  });
});

describe('hashServerSeed / verifyRoll', () => {
  it('hashes the seed bytes with SHA-256', async () => {
    expect(await hashServerSeed(SEED)).toBe(createHash('sha256').update(Buffer.from(SEED, 'hex')).digest('hex'));
  });

  it('verifies a genuine roll and rejects tampering', async () => {
    const hash = await hashServerSeed(SEED);
    const roll = await hmacRoll(SEED, 'client', 3);
    expect(await verifyRoll(SEED, hash, 'client', 3, roll)).toBe(true);
    expect(await verifyRoll(SEED, hash, 'client', 4, roll)).toBe(false);
    expect(await verifyRoll(randomHex(32), hash, 'client', 3, roll)).toBe(false);
  });
});
