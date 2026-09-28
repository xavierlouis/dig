// src/services/blockchain/solanaHelpers.ts
// Wallet adapter refs for server mode (deposit signing, phase 3).

import type { Connection } from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';

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
