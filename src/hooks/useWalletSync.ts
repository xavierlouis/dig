// src/hooks/useWalletSync.ts
'use client';

import { useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useGameStore } from '@/store/useGameStore';
import { setWalletContext } from '@/services/blockchain/solanaHelpers';

export function useWalletSync() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, connected } = wallet;

  const connectWallet = useGameStore((s) => s.connectWallet);
  const disconnectWallet = useGameStore((s) => s.disconnectWallet);

  // Keep wallet context in sync so the server-mode game service can sign deposits
  useEffect(() => {
    if (connected && publicKey) {
      setWalletContext(wallet, connection);
    }
  }, [connected, publicKey, wallet, connection]);

  // Sync wallet state to Zustand
  useEffect(() => {
    if (connected && publicKey) {
      const address = publicKey.toBase58();
      connection.getBalance(publicKey).then((lamports) => {
        connectWallet(address, lamports / LAMPORTS_PER_SOL);
      });
    } else {
      disconnectWallet();
    }
  }, [connected, publicKey, connection, connectWallet, disconnectWallet]);
}
