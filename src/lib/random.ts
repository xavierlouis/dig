// src/lib/random.ts

import type { TierName } from '@/services/types';
import { ECONOMY } from '@/config/economy';

export interface RevealLog {
  id: string;
  sessionId: string;
  tombIndex: number;
  timestamp: number;
  seed: string;
  roll: number; // raw 0-1 value
  tier: TierName;
  payout: number;
  tokenValue: number;
  choice: 'sol' | 'token' | null;
  actualPayout: number;
}

// In-memory log (also persisted to localStorage)
let revealLogs: RevealLog[] = [];

const STORAGE_KEY = 'dig_reveal_logs';

/** Load logs from localStorage on init */
function loadLogs(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) revealLogs = JSON.parse(raw);
  } catch {
    revealLogs = [];
  }
}

/** Save logs to localStorage */
function saveLogs(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(revealLogs));
  } catch {
    // localStorage full or unavailable
  }
}

/** Generate a random seed string */
function generateSeed(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Generate a unique ID */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Roll a tier based on economy odds.
 * Returns the tier name and the raw roll value.
 */
export function rollTier(): { tier: TierName; roll: number; seed: string } {
  const seed = generateSeed();
  const roll = Math.random();

  let cumulative = 0;
  const tiers = Object.entries(ECONOMY.TIERS) as [TierName, typeof ECONOMY.TIERS[TierName]][];

  for (const [tierName, config] of tiers) {
    cumulative += config.odds;
    if (roll < cumulative) {
      return { tier: tierName, roll, seed };
    }
  }

  // Fallback (shouldn't happen if odds sum to 1.0)
  return { tier: 'dust', roll, seed };
}

/** Log a reveal */
export function logReveal(log: RevealLog): void {
  if (revealLogs.length === 0) loadLogs();
  revealLogs.push(log);
  saveLogs();
}

/** Get all logs */
export function getRevealLogs(): RevealLog[] {
  if (revealLogs.length === 0) loadLogs();
  return [...revealLogs];
}

/** Clear all logs */
export function clearRevealLogs(): void {
  revealLogs = [];
  saveLogs();
}

/** Create a new reveal log entry */
export function createRevealLog(
  sessionId: string,
  tombIndex: number,
  tier: TierName,
  roll: number,
  seed: string,
  payout: number,
  tokenValue: number,
): RevealLog {
  return {
    id: generateId(),
    sessionId,
    tombIndex,
    timestamp: Date.now(),
    seed,
    roll,
    tier,
    payout,
    tokenValue,
    choice: null,
    actualPayout: payout,
  };
}

/** Get tier distribution from logs */
export function getTierDistribution(): Record<TierName, number> {
  const logs = getRevealLogs();
  const dist: Record<TierName, number> = {
    dust: 0, bone: 0, coffin: 0, zombie: 0, resurrect: 0,
  };
  for (const log of logs) {
    dist[log.tier]++;
  }
  return dist;
}
