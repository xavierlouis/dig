// src/components/ui/GameModals.tsx
// Global deposit / withdraw modals, opened from anywhere via useGameStore().openModal.
'use client';

import { AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import DepositModal from './DepositModal';
import WithdrawModal from './WithdrawModal';

export default function GameModals() {
  const modal = useGameStore((s) => s.modal);
  const signedIn = useGameStore((s) => s.account !== null);

  return (
    <AnimatePresence>
      {signedIn && modal === 'deposit' && <DepositModal key="deposit" />}
      {signedIn && modal === 'withdraw' && <WithdrawModal key="withdraw" />}
    </AnimatePresence>
  );
}
