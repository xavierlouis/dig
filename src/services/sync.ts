// src/services/sync.ts
// Pull account / wallet / jackpot from the game service into the store.
'use client';

import { gameService } from '@/services';
import { useGameStore } from '@/store/useGameStore';
import { lamportsToSol } from '@/lib/game/economy';

export async function refreshAccount() {
  const [account, walletLamports] = await Promise.all([
    gameService.getAccount(),
    gameService.getWalletBalance(),
  ]);
  const store = useGameStore.getState();
  store.setAccount(account);
  store.setBalance(lamportsToSol(walletLamports));
}

export async function refreshJackpot() {
  useGameStore.getState().setJackpot(await gameService.getJackpot());
}
