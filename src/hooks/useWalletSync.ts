// src/hooks/useWalletSync.ts
'use client';

import { useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useGameStore } from '@/store/useGameStore';
import { setWalletContext } from '@/services/blockchain/solanaHelpers';

const DIG_TOKEN_MINT = process.env.NEXT_PUBLIC_DIG_TOKEN_MINT;

export function useWalletSync() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, connected } = wallet;

  const connectWallet = useGameStore((s) => s.connectWallet);
  const disconnectWallet = useGameStore((s) => s.disconnectWallet);
  const setBalance = useGameStore((s) => s.setBalance);
  const setDigBalance = useGameStore((s) => s.setDigBalance);

  // Keep wallet context in sync so blockchainDigService can use it
  useEffect(() => {
    if (connected && publicKey) {
      setWalletContext(wallet, connection);
    }
  }, [connected, publicKey, wallet, connection]);

  const refreshBalances = useCallback(async () => {
    if (!publicKey) return;

    // Fetch SOL balance
    const lamports = await connection.getBalance(publicKey);
    setBalance(lamports / LAMPORTS_PER_SOL);

    // Fetch DIG token balance
    if (DIG_TOKEN_MINT) {
      try {
        const mint = new PublicKey(DIG_TOKEN_MINT);
        const ata = await getAssociatedTokenAddress(mint, publicKey);
        const account = await getAccount(connection, ata);
        setDigBalance(Number(account.amount));
      } catch {
        // ATA doesn't exist yet — balance is 0
        setDigBalance(0);
      }
    }
  }, [publicKey, connection, setBalance, setDigBalance]);

  // Sync wallet state to Zustand
  useEffect(() => {
    if (connected && publicKey) {
      const address = publicKey.toBase58();
      // Initial balance fetch
      connection.getBalance(publicKey).then((lamports) => {
        connectWallet(address, lamports / LAMPORTS_PER_SOL);
      });
      // Also fetch dig token balance
      refreshBalances();
    } else {
      disconnectWallet();
    }
  }, [connected, publicKey, connection, connectWallet, disconnectWallet, refreshBalances]);

  return { refreshBalances };
}
