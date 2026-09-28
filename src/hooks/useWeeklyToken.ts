// src/hooks/useWeeklyToken.ts
'use client';

import { useGameStore } from '@/store/useGameStore';
import { getCurrentWeekToken } from '@/config/weekly';
import type { DeadToken } from '@/services/types';

/** The token the jackpot vault is buying this week (falls back to the calendar week before the first fetch). */
export function useWeeklyToken(): DeadToken {
  const token = useGameStore((s) => s.jackpot?.buyingNow.token);
  return token ?? getCurrentWeekToken();
}
