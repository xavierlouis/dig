// src/config/tokens.ts

import type { DeadToken } from '@/services/types';
import deadTokens from '@/data/dead-tokens.json';

/** Full roster of dead tokens */
export const TOKEN_ROSTER: DeadToken[] = deadTokens as DeadToken[];

/** Lookup a token by id */
export function getTokenById(id: string): DeadToken | undefined {
  return TOKEN_ROSTER.find((t) => t.id === id);
}
