// src/components/ui/WalletButtonMock.tsx
'use client';

import { useGameStore } from '@/store/useGameStore';
import { mockWalletService, MOCK_ADDRESS } from '@/services/mock/mockWalletService';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export default function WalletButtonMock() {
  const walletConnected = useGameStore((s) => s.walletConnected);
  const balance = useGameStore((s) => s.balance);
  const connectWallet = useGameStore((s) => s.connectWallet);
  const disconnectWallet = useGameStore((s) => s.disconnectWallet);
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const address = await mockWalletService.connect();
      const bal = await mockWalletService.getBalance();
      connectWallet(address, bal);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    mockWalletService.disconnect();
    disconnectWallet();
  };

  return (
    <AnimatePresence mode="wait">
      {walletConnected ? (
        <motion.button
          key="connected"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={handleDisconnect}
          className="rounded-[14px] border border-muted/20 bg-gradient-to-b from-stone/90 to-grave/90 px-4 py-2.5 font-semibold shadow-panel transition hover:border-eerie/30"
        >
          <span className="text-[12px] text-muted/60">{MOCK_ADDRESS}</span>
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
          disabled={loading}
          className="rounded-[14px] border border-muted/20 bg-gradient-to-b from-stone/90 to-grave/90 px-4 py-3 font-extrabold shadow-panel transition hover:border-eerie/30 disabled:opacity-50"
        >
          {loading ? 'Connecting...' : 'Connect Wallet'}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
