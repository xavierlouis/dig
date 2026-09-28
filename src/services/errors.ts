// src/services/errors.ts

export type GameErrorCode =
  | 'NOT_SIGNED_IN'
  | 'INSUFFICIENT_CREDIT'
  | 'INSUFFICIENT_WALLET'
  | 'LEVEL_LOCKED'
  | 'BELOW_MINIMUM'
  | 'REJECTED'
  | 'NETWORK';

export class GameError extends Error {
  constructor(public readonly code: GameErrorCode, message: string) {
    super(message);
    this.name = 'GameError';
  }
}

export function isGameError(err: unknown, code?: GameErrorCode): err is GameError {
  return err instanceof GameError && (code === undefined || err.code === code);
}
