// src/services/mock/mockPriceService.ts

import type { IPriceService } from '../interfaces';

let buyPressure = 0;

export const mockPriceService: IPriceService = {
  async getTokenPrice(): Promise<number> {
    // Return a mock price that slowly drifts
    return 0.00001 + Math.random() * 0.000005;
  },

  async getBuyPressureToday(): Promise<number> {
    return buyPressure;
  },
};

/** Simulate buy pressure increasing when items are bought */
export function mockAddBuyPressure(amount: number): void {
  buyPressure += amount;
}

export function mockGetBuyPressure(): number {
  return buyPressure;
}
