// src/services/mock/mockWalletService.ts
// Fake wallet for mock mode. Its SOL balance persists in localStorage so deposits
// and withdrawals survive a refresh.

import { LAMPORTS_PER_SOL } from '@/config/economy';

const MOCK_ADDRESS = '7xKX...m4Dq'; // truncated display
const MOCK_FULL_ADDRESS = '7xKXpN3Rqb8vJ5e2LwZ9mK4hY6cT1fA3nU8dR0pM4Dq';
const INITIAL_LAMPORTS = 5 * LAMPORTS_PER_SOL;
const STORAGE_KEY = 'dig_mock_wallet_v1';

let connected = false;
let lamports: number | null = null;

function load(): number {
  if (lamports !== null) return lamports;
  lamports = INITIAL_LAMPORTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null && Number.isFinite(Number(raw))) lamports = Number(raw);
  } catch {
    // storage unavailable — keep the default
  }
  return lamports;
}

function save(value: number) {
  lamports = value;
  try { localStorage.setItem(STORAGE_KEY, String(value)); } catch { /* ignore */ }
}

export const mockWalletService = {
  async connect(): Promise<string> {
    await new Promise((r) => setTimeout(r, 600));
    connected = true;
    load();
    return MOCK_FULL_ADDRESS;
  },

  disconnect(): void {
    connected = false;
  },

  isConnected(): boolean {
    return connected;
  },

  /** Lamports. */
  getBalance(): number {
    return load();
  },
};

/** Internal: used by mockGameService for deposits and withdrawals. */
export function mockWalletDebit(amount: number): boolean {
  const current = load();
  if (current < amount) return false;
  save(current - amount);
  return true;
}

export function mockWalletCredit(amount: number): void {
  save(load() + amount);
}

export function mockWalletReset(): void {
  save(INITIAL_LAMPORTS);
}

export { MOCK_FULL_ADDRESS, MOCK_ADDRESS };
