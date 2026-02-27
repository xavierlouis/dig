// src/services/interfaces.ts

import type { LevelId, LevelSession, TombReveal, ClaimResult } from './types';

export interface IDigService {
  mintDigs(level: LevelId, count: number): Promise<number>; // returns new dig balance
  startRound(level: LevelId): Promise<LevelSession>;
  digAll(roundId: string): Promise<TombReveal[]>; // burns all digs, returns all reveals
  claimReward(revealId: string, choice: 'sol' | 'token'): Promise<ClaimResult>;
}

export interface IWalletService {
  connect(): Promise<string>;
  disconnect(): void;
  getBalance(): Promise<number>;
  isConnected(): boolean;
}

export interface IPriceService {
  getTokenPrice(tokenMint: string): Promise<number>;
  getBuyPressureToday(): Promise<number>;
}

export interface IEconomyService {
  getPrizePoolBalance(): Promise<number>;
  getJackpotBalance(): Promise<number>;
}
