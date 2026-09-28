// src/services/types.ts
// All money amounts are integer lamports unless the name says Sol.

export type LevelId = 'shallow_grave' | 'deep_crypt' | 'ancient_vault';
export type ItemType = 'pickaxe' | 'lamp' | 'key'; // cosmetic tool per level
export type TierName = 'dust' | 'bone' | 'coffin' | 'zombie' | 'resurrect';

export interface Account {
  wallet: string;
  credit: number;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

export interface DigResult {
  id: string;
  level: LevelId;
  tier: TierName;
  wager: number;
  payout: number;          // instant payout credited (0 for dust and resurrect)
  nonce: number;
  roll: number;            // HMAC roll in [0, 1)
  forced?: boolean;        // mock debug only: tier was forced, roll doesn't match
  credit: number;          // balance after this dig, jackpot SOL share included
  jackpot?: JackpotWin;    // set on resurrect
}

export interface JackpotHolding {
  asset: string;           // token id / mint, or 'SOL'
  symbol: string;          // '$RUGCAT' or 'SOL'
  amount: number;          // raw units (lamports for SOL)
  decimals: number;
  valueSol: number | null; // at TWAP; null when the token has no price
}

export interface JackpotWin {
  shares: JackpotHolding[]; // the winner's 80% of each holding
  valueSol: number;
}

export interface JackpotState {
  valueSol: number;
  holdings: JackpotHolding[];
  buyingNow: {
    weekId: string;
    token: DeadToken | null;
    solSpentThisWeek: number; // lamports
  };
  growingSince: number;       // epoch ms of the last win (or launch)
}

export type WithdrawalStatus = 'pending' | 'sent' | 'confirmed' | 'failed' | 'review';

export interface Withdrawal {
  id: string;
  lamports: number;
  status: WithdrawalStatus;
}

export interface SeedRotation {
  revealedServerSeed: string;
  newServerSeedHash: string;
}

/** Client-only visual grouping of 3 tombs. */
export interface RoundState {
  id: string;
  level: LevelId;
  tombs: TombState[];
}

export interface TombState {
  index: number;
  status: 'sealed' | 'opened';
  dig?: DigResult;
}

export interface DeadToken {
  id: string;
  name: string;            // "$RUGCAT"
  symbol: string;
  mint?: string;           // real mint (required before mainnet)
  poolAddress?: string;
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
