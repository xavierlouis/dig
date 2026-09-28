// src/components/ui/CreditPill.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { formatSol } from '@/lib/game/economy';

/** Gold flash on an element when a number goes up. */
export function useGainFlash(value: number | undefined) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  useEffect(() => {
    if (value !== undefined && prev.current !== undefined && value > prev.current) {
      ref.current?.animate(
        [{ color: '#FFD700', textShadow: '0 0 10px rgba(255,215,0,0.6)' }, {}],
        { duration: 700, easing: 'ease-out' },
      );
    }
    prev.current = value;
  }, [value]);
  return ref;
}

export default function CreditPill() {
  const credit = useGameStore((s) => s.account?.credit);
  const openModal = useGameStore((s) => s.openModal);
  const creditRef = useGainFlash(credit);

  if (credit === undefined) return null;

  return (
    <div className="flex items-center gap-2 rounded-[14px] border border-muted/20 bg-black/50 py-1.5 pl-4 pr-1.5 backdrop-blur-sm">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted/50">Credit</span>
      <span ref={creditRef} className="font-mono text-[14px] font-bold text-ink">
        {formatSol(credit)} SOL
      </span>
      <button
        onClick={() => openModal('deposit')}
        className="ml-1 rounded-[10px] bg-[#f0c850]/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#f0c850] transition hover:bg-[#f0c850]/25"
      >
        Deposit
      </button>
      <button
        onClick={() => openModal('withdraw')}
        className="rounded-[10px] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted/60 transition hover:text-ink"
      >
        Withdraw
      </button>
    </div>
  );
}
