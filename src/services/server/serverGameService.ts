// src/services/server/serverGameService.ts
// Server mode (ledger API routes) arrives in phase 2 — see documentation/CREDIT_LEDGER_PLAN.md §10.

import type { IGameService } from '../interfaces';

function notYet(): never {
  throw new Error(
    'Server mode is not implemented yet (phase 2). Set NEXT_PUBLIC_USE_BLOCKCHAIN=false to play in mock mode.',
  );
}

export const serverGameService: IGameService = {
  signIn: async () => notYet(),
  signOut: async () => notYet(),
  getAccount: async () => notYet(),
  getWalletBalance: async () => notYet(),
  deposit: async () => notYet(),
  dig: async () => notYet(),
  withdraw: async () => notYet(),
  rotateSeed: async () => notYet(),
  getJackpot: async () => notYet(),
};
