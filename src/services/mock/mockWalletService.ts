// src/services/mock/mockWalletService.ts

import type { IWalletService } from '../interfaces';

const MOCK_ADDRESS = '7xKX...m4Dq'; // truncated display
const MOCK_FULL_ADDRESS = '7xKXpN3Rqb8vJ5e2LwZ9mK4hY6cT1fA3nU8dR0pM4Dq';
const INITIAL_BALANCE = 2.0; // SOL

let connected = false;
let balance = INITIAL_BALANCE;

export const mockWalletService: IWalletService = {
  async connect(): Promise<string> {
    // Simulate connection delay
    await new Promise((r) => setTimeout(r, 800));
    connected = true;
    balance = INITIAL_BALANCE;
    return MOCK_FULL_ADDRESS;
  },

  disconnect(): void {
    connected = false;
    balance = 0;
  },

  async getBalance(): Promise<number> {
    await new Promise((r) => setTimeout(r, 200));
    return balance;
  },

  isConnected(): boolean {
    return connected;
  },
};

/** Internal: adjust balance (used by mockItemService) */
export function mockDeductBalance(amount: number): boolean {
  if (balance < amount) return false;
  balance -= amount;
  return true;
}

export function mockAddBalance(amount: number): void {
  balance += amount;
}

export function mockGetBalance(): number {
  return balance;
}

export { MOCK_FULL_ADDRESS, MOCK_ADDRESS };
