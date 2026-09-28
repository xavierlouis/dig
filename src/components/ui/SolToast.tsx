// src/components/ui/SolToast.tsx
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatSol } from '@/lib/game/economy';

type ToastKind = 'credit' | 'error' | 'info';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  text: string;
  detail?: string;
}

let _toastId = 0;
let _listener: ((item: ToastItem) => void) | null = null;

export function showToast(kind: ToastKind, text: string, detail?: string) {
  _listener?.({ id: ++_toastId, kind, text, detail });
}

/** "+0.04 SOL credited" — amount in lamports. */
export function showSolToast(lamports: number) {
  if (lamports <= 0) return;
  showToast('credit', `+${formatSol(lamports)} SOL`, 'credited');
}

const STYLES: Record<ToastKind, { border: string; text: string; glow: string }> = {
  credit: { border: 'border-[#f0c850]/30', text: 'text-[#f0c850]', glow: 'shadow-[0_0_20px_rgba(240,200,80,0.15)]' },
  error:  { border: 'border-[#FF3D3D]/30', text: 'text-[#FF6B6B]', glow: 'shadow-[0_0_20px_rgba(255,61,61,0.12)]' },
  info:   { border: 'border-[#8B83FF]/30', text: 'text-[#b9b1ff]', glow: 'shadow-[0_0_20px_rgba(108,99,255,0.12)]' },
};

export default function SolToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

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
    <div className="fixed top-24 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastEntry key={t.id} item={t} onDone={() => removeToast(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastEntry({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, item.kind === 'error' ? 5000 : 3000);
    return () => clearTimeout(timer);
  }, [onDone, item.kind]);

  const style = STYLES[item.kind];

  return (
    <motion.div
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={`pointer-events-auto max-w-[320px] rounded-xl border bg-black/80 backdrop-blur-md px-4 py-3 ${style.border} ${style.glow}`}
    >
      <span className={`text-[13px] font-bold font-cinzel ${style.text}`}>
        {item.text}
      </span>
      {item.detail && (
        <span className="ml-2 text-[11px] text-white/40">
          {item.detail}
        </span>
      )}
    </motion.div>
  );
}
