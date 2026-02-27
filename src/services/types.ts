// src/services/types.ts

export type LevelId = 'shallow_grave' | 'deep_crypt' | 'ancient_vault';
export type ItemType = 'pickaxe' | 'lamp' | 'key';
export type TierName = 'dust' | 'bone' | 'coffin' | 'zombie' | 'resurrect';

export interface LevelSession {
  id: string;
  level: LevelId;
  tokenId: string; // today's featured token
  tombs: TombState[];  // 3 tombs (visual grouping)
}

export interface TombState {
  index: number; // 0, 1, 2
  status: 'sealed' | 'opened';
  reveal?: TombReveal;
}

export interface TombReveal {
  id: string;
  tombIndex: number;
  tokenId: string;
  tier: TierName;
  solPayout: number;       // Option A value
  tokenPayout: number;     // Option B value (in SOL equivalent)
  choice: 'sol' | 'token' | null; // null if Dust/Bone (no choice)
  actualPayout: number;
}

export interface DeadToken {
  id: string;
  name: string;            // "$RUGCAT"
  symbol: string;
  born: string;
  died: string;
  causeOfDeath: string;
  athMarketCap: string;
  currentPrice: number;
  liquidity: number;
  holders: number;
  logoColor: string;       // hex for generated placeholder
  epitaph: string;
}

export interface ClaimResult {
  revealId: string;
  choice: 'sol' | 'token';
  amount: number;
  tokenSymbol?: string;
}
