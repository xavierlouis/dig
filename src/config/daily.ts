// src/config/daily.ts

import type { DeadToken } from '@/services/types';
import deadTokens from '@/data/dead-tokens.json';

/**
 * Get today's featured dead token.
 * Rotates through the roster daily based on the date.
 */
export function getTodaysToken(): DeadToken {
  const tokens = deadTokens as DeadToken[];
  const today = new Date();
  // Day index: days since epoch mod roster length
  const dayIndex = Math.floor(today.getTime() / (1000 * 60 * 60 * 24));
  return tokens[dayIndex % tokens.length];
}

/**
 * Get the token for a specific date.
 */
export function getTokenForDate(date: Date): DeadToken {
  const tokens = deadTokens as DeadToken[];
  const dayIndex = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
  return tokens[dayIndex % tokens.length];
}
