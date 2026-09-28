// src/services/index.ts
// Barrel that exports the correct service implementation based on env var.

import type { IGameService } from './interfaces';

export const USE_BLOCKCHAIN = process.env.NEXT_PUBLIC_USE_BLOCKCHAIN === 'true';

// Lazy singleton so we don't import server-mode code when in mock mode
let _gameService: IGameService | null = null;

export function getGameService(): IGameService {
  if (!_gameService) {
    if (USE_BLOCKCHAIN) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { serverGameService } = require('./server/serverGameService');
      _gameService = serverGameService;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { mockGameService } = require('./mock/mockGameService');
      _gameService = mockGameService;
    }
  }
  return _gameService!;
}

// Convenience getter that looks like a direct export
export const gameService: IGameService = new Proxy({} as IGameService, {
  get(_target, prop) {
    return (getGameService() as unknown as Record<string, unknown>)[prop as string];
  },
});

export { GameError, isGameError } from './errors';
