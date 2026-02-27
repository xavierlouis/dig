// src/services/mock/mockItemService.ts

import type { IDigService } from '../interfaces';
import type { LevelId, LevelSession, TombReveal, ClaimResult } from '../types';
import { ECONOMY } from '@/config/economy';
import { getTodaysToken } from '@/config/daily';
import { rollTier, createRevealLog, logReveal } from '@/lib/random';
import { calculateSolPayout, calculateTokenPayout, calculateJackpotPayout } from '@/lib/economy';

let sessionCounter = 0;
let revealCounter = 0;

// In-memory dig balance (per level, keyed by LevelId)
const digBalances = new Map<LevelId, number>();

// In-memory stores
const sessions = new Map<string, LevelSession>();
const reveals = new Map<string, TombReveal>();

function generateSessionId(): string {
  return `session-${++sessionCounter}-${Date.now()}`;
}

function generateRevealId(): string {
  return `reveal-${++revealCounter}-${Date.now()}`;
}

export const mockDigService: IDigService = {
  async mintDigs(level: LevelId, count: number): Promise<number> {
    await new Promise((r) => setTimeout(r, 300));
    const current = digBalances.get(level) ?? 0;
    const newBalance = current + count;
    digBalances.set(level, newBalance);
    return newBalance;
  },

  async startRound(level: LevelId): Promise<LevelSession> {
    await new Promise((r) => setTimeout(r, 300));

    const token = getTodaysToken();
    const sessionId = generateSessionId();
    const session: LevelSession = {
      id: sessionId,
      level,
      tokenId: token.id,
      tombs: [
        { index: 0, status: 'sealed' },
        { index: 1, status: 'sealed' },
        { index: 2, status: 'sealed' },
      ],
    };

    sessions.set(sessionId, session);
    return session;
  },

  async digAll(roundId: string): Promise<TombReveal[]> {
    await new Promise((r) => setTimeout(r, 300));

    const session = sessions.get(roundId);
    if (!session) throw new Error(`Round ${roundId} not found`);

    const level = session.level;
    const count = session.tombs.length;
    const balance = digBalances.get(level) ?? 0;
    if (balance < count) throw new Error('Not enough digs remaining');

    // Burn all digs at once
    digBalances.set(level, balance - count);

    const token = getTodaysToken();
    const allReveals: TombReveal[] = [];

    for (let i = 0; i < count; i++) {
      const { tier, roll, seed } = rollTier();
      const revealId = generateRevealId();

      const solPayout = calculateSolPayout(tier, level);
      const tokenPayout = calculateTokenPayout(tier, level);

      let finalSolPayout = solPayout;
      if (tier === 'resurrect') {
        finalSolPayout = calculateJackpotPayout(1.0);
      }

      const reveal: TombReveal = {
        id: revealId,
        tombIndex: i,
        tokenId: token.id,
        tier,
        solPayout: finalSolPayout,
        tokenPayout: tokenPayout || finalSolPayout * ECONOMY.OPTION_B_PREMIUM,
        choice: null,
        actualPayout: finalSolPayout,
      };

      reveals.set(revealId, reveal);

      // Update session
      const tomb = session.tombs[i];
      if (tomb) {
        tomb.status = 'opened';
        tomb.reveal = reveal;
      }

      // Log for audit
      const logEntry = createRevealLog(
        roundId, i, tier, roll, seed, finalSolPayout, tokenPayout,
      );
      logReveal(logEntry);

      allReveals.push(reveal);
    }

    return allReveals;
  },

  async claimReward(revealId: string, choice: 'sol' | 'token'): Promise<ClaimResult> {
    await new Promise((r) => setTimeout(r, 300));

    const reveal = reveals.get(revealId);
    if (!reveal) throw new Error(`Reveal ${revealId} not found`);

    reveal.choice = choice;
    const amount = choice === 'sol' ? reveal.solPayout : reveal.tokenPayout;
    reveal.actualPayout = amount;

    return {
      revealId,
      choice,
      amount,
      tokenSymbol: choice === 'token' ? reveal.tokenId : undefined,
    };
  },
};
