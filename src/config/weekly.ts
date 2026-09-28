// src/config/weekly.ts
// Token of the week: rotates through the roster every Monday 00:00 UTC.

import type { DeadToken } from '@/services/types';
import { TOKEN_ROSTER } from './tokens';
import { weekIndex } from '@/lib/game/week';

export function getTokenForWeek(index: number): DeadToken {
  const n = TOKEN_ROSTER.length;
  return TOKEN_ROSTER[((index % n) + n) % n];
}

export function getCurrentWeekToken(): DeadToken {
  return getTokenForWeek(weekIndex());
}
