// src/services/index.ts
// Barrel that exports the correct service implementation based on env var.

import type { IDigService } from './interfaces';

const USE_BLOCKCHAIN = process.env.NEXT_PUBLIC_USE_BLOCKCHAIN === 'true';

// Lazy singletons so we don't import blockchain code when in mock mode
let _digService: IDigService | null = null;
let _addBuyPressure: ((amount: number) => void) | null = null;

export function getDigService(): IDigService {
  if (!_digService) {
    if (USE_BLOCKCHAIN) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { blockchainDigService } = require('./blockchain/blockchainDigService');
      _digService = blockchainDigService;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { mockDigService } = require('./mock/mockItemService');
      _digService = mockDigService;
    }
  }
  return _digService!;
}

export function getAddBuyPressure(): (amount: number) => void {
  if (!_addBuyPressure) {
    if (USE_BLOCKCHAIN) {
      // In blockchain mode, buy pressure is a no-op on the client
      // (handled server-side or via on-chain events)
      _addBuyPressure = () => {};
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { mockAddBuyPressure } = require('./mock/mockPriceService');
      _addBuyPressure = mockAddBuyPressure;
    }
  }
  return _addBuyPressure!;
}

// Convenience getters that look like direct exports
export const digService: IDigService = new Proxy({} as IDigService, {
  get(_target, prop) {
    return (getDigService() as unknown as Record<string, unknown>)[prop as string];
  },
});

export function addBuyPressure(amount: number) {
  getAddBuyPressure()(amount);
}
