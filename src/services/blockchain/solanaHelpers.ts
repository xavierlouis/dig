// src/services/blockchain/solanaHelpers.ts

import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import { useGameStore } from '@/store/useGameStore';

const DIG_TOKEN_MINT = process.env.NEXT_PUBLIC_DIG_TOKEN_MINT;

// Wallet adapter reference — set once by WalletButtonBlockchain/useWalletSync
let _wallet: WalletContextState | null = null;
let _connection: Connection | null = null;

export function setWalletContext(
  wallet: WalletContextState,
  connection: Connection,
) {
  _wallet = wallet;
  _connection = connection;
}

export function getWalletContext() {
  if (!_wallet || !_connection) {
    throw new Error('Wallet context not initialized. Call setWalletContext first.');
  }
  return { wallet: _wallet, connection: _connection };
}

/** Re-read SOL + DIG balances from chain and push into Zustand */
export async function refreshBalances() {
  const { wallet, connection } = getWalletContext();
  if (!wallet.publicKey) return;

  const lamports = await connection.getBalance(wallet.publicKey);
  useGameStore.getState().setBalance(lamports / LAMPORTS_PER_SOL);

  if (DIG_TOKEN_MINT) {
    try {
      const mint = new PublicKey(DIG_TOKEN_MINT);
      const ata = await getAssociatedTokenAddress(mint, wallet.publicKey);
      const account = await getAccount(connection, ata);
      useGameStore.getState().setDigBalance(Number(account.amount));
    } catch {
      useGameStore.getState().setDigBalance(0);
    }
  }
}
