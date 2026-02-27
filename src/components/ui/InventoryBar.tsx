// src/components/ui/InventoryBar.tsx
'use client';

import { useGameStore } from '@/store/useGameStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

export default function InventoryBar() {
  const digBalance = useGameStore((s) => s.digBalance);
  const [shaking, setShaking] = useState(false);
  const prevBalance = useRef(digBalance);

  // Shake on decrement
  useEffect(() => {
    if (digBalance < prevBalance.current && digBalance >= 0) {
      setShaking(true);
      const timer = setTimeout(() => setShaking(false), 400);
      prevBalance.current = digBalance;
      return () => clearTimeout(timer);
    }
    prevBalance.current = digBalance;
  }, [digBalance]);

  if (digBalance <= 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: 1,
          scale: 1,
          x: shaking ? [0, -3, 3, -2, 2, 0] : 0,
        }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-2 rounded-[12px] border border-muted/20 bg-black/20 px-3 py-2"
      >
        <span className="text-[13px] font-semibold text-ink/80">Digs</span>
        <motion.span
          key={digBalance}
          initial={{ scale: 1.4 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className="font-mono text-[13px] font-bold text-torch"
        >
          x{digBalance}
        </motion.span>
      </motion.div>
    </AnimatePresence>
  );
}
