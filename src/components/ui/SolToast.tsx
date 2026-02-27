// src/components/ui/SolToast.tsx
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SolToastItem {
  id: number;
  amount: number;
}

let _toastId = 0;
let _listener: ((item: SolToastItem) => void) | null = null;

/** Call from anywhere to show a SOL transfer toast */
export function showSolToast(amount: number) {
  if (amount <= 0) return;
  _listener?.({ id: ++_toastId, amount });
}

export default function SolToast() {
  const [toasts, setToasts] = useState<SolToastItem[]>([]);

  useEffect(() => {
    _listener = (item) => {
      setToasts((prev) => [...prev, item]);
    };
    return () => { _listener = null; };
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastEntry key={t.id} item={t} onDone={() => removeToast(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastEntry({ item, onDone }: { item: SolToastItem; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="pointer-events-auto rounded-xl border border-[#f0c850]/30 bg-black/80 backdrop-blur-md px-4 py-3 shadow-[0_0_20px_rgba(240,200,80,0.15)]"
    >
      <span className="text-[13px] font-bold text-[#f0c850] font-[var(--font-cinzel)]">
        +{item.amount.toFixed(4)} SOL
      </span>
      <span className="ml-2 text-[11px] text-white/40">
        sent to wallet
      </span>
    </motion.div>
  );
}
