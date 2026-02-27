// src/components/ui/WalletButtonBlockchain.tsx
'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWalletSync } from '@/hooks/useWalletSync';
import { useGameStore } from '@/store/useGameStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function WalletButtonBlockchain() {
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const balance = useGameStore((s) => s.balance);

  // Syncs wallet adapter → Zustand store
  useWalletSync();

  const handleConnect = () => {
    setVisible(true);
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const shortAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : '';

  return (
    <AnimatePresence mode="wait">
      {connected && publicKey ? (
        <motion.button
          key="connected"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={handleDisconnect}
          className="rounded-[14px] border border-muted/20 bg-gradient-to-b from-stone/90 to-grave/90 px-4 py-2.5 font-semibold shadow-panel transition hover:border-eerie/30"
        >
          <span className="text-[12px] text-muted/60">{shortAddress}</span>
          <span className="ml-2 font-mono text-[13px] text-eerie">{balance.toFixed(2)} SOL</span>
        </motion.button>
      ) : (
        <motion.button
          key="disconnected"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={handleConnect}
          className="rounded-[14px] border border-muted/20 bg-gradient-to-b from-stone/90 to-grave/90 px-4 py-3 font-extrabold shadow-panel transition hover:border-eerie/30 disabled:opacity-50"
        >
          Connect Wallet
        </motion.button>
      )}
    </AnimatePresence>
  );
}
