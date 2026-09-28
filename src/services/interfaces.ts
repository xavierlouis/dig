// src/services/interfaces.ts

import type {
  Account, DigResult, JackpotState, LevelId, SeedRotation, Withdrawal,
} from './types';

/**
 * The whole game behind one interface: the mock implements it in the browser,
 * the server implementation calls the ledger API routes.
 * Errors are thrown as GameError (see ./errors).
 */
export interface IGameService {
  signIn(): Promise<Account>;                     // mock: instant
  signOut(): Promise<void>;
  getAccount(): Promise<Account | null>;          // null when not signed in
  getWalletBalance(): Promise<number>;            // wallet SOL, lamports
  deposit(lamports: number): Promise<Account>;    // server mode: 1 wallet popup
  dig(level: LevelId, requestId: string): Promise<DigResult>;
  withdraw(lamports: number, requestId: string): Promise<{ withdrawal: Withdrawal; account: Account }>;
  rotateSeed(clientSeed?: string): Promise<SeedRotation>;
  getJackpot(): Promise<JackpotState>;
}
