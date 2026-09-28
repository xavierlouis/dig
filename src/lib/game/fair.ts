// src/lib/game/fair.ts
// Provably fair rolls: roll = HMAC_SHA256(serverSeed, "clientSeed:nonce"), first 52 bits / 2^52.
// Web Crypto only, so the same code runs in the browser (mock, /fair) and on the server.

const encoder = new TextEncoder();

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  if (hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) throw new Error('Invalid hex string');
  const bytes = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

export function randomHex(byteLength = 32): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(byteLength)));
}

/** Published commitment: SHA-256 of the server seed bytes. */
export async function hashServerSeed(serverSeedHex: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', hexToBytes(serverSeedHex));
  return bytesToHex(new Uint8Array(digest));
}

export async function hmacRoll(serverSeedHex: string, clientSeed: string, nonce: number): Promise<number> {
  const key = await crypto.subtle.importKey(
    'raw', hexToBytes(serverSeedHex), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(`${clientSeed}:${nonce}`)));
  return macToRoll(mac);
}

/** First 52 bits of the MAC as a float in [0, 1). 52 bits fit exactly in a double. */
export function macToRoll(mac: Uint8Array): number {
  let value = 0;
  for (let i = 0; i < 6; i++) value = value * 256 + mac[i];
  value = value * 16 + (mac[6] >> 4);
  return value / 2 ** 52;
}

/** Check a past dig once its server seed has been revealed. */
export async function verifyRoll(
  serverSeedHex: string,
  serverSeedHash: string,
  clientSeed: string,
  nonce: number,
  roll: number,
): Promise<boolean> {
  if ((await hashServerSeed(serverSeedHex)) !== serverSeedHash) return false;
  return (await hmacRoll(serverSeedHex, clientSeed, nonce)) === roll;
}
