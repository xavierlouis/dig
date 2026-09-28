// src/components/level/JackpotWinOverlay.tsx
// Resurrect: the winner's 80% of every holding in the crypt bag.
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { JackpotWin } from '@/services/types';
import { ECONOMY } from '@/config/economy';
import { formatHoldingValue, formatTokenAmount } from '@/components/JackpotDisplay';

interface JackpotWinOverlayProps {
  win: JackpotWin;
  onClose: () => void;
}

export default function JackpotWinOverlay({ win, onClose }: JackpotWinOverlayProps) {
  // Token transfers complete one by one (mock: simulated; server mode: payout status, phase 4)
  const tokenCount = win.shares.filter((h) => h.asset !== 'SOL').length;
  const [sent, setSent] = useState(0);
  useEffect(() => {
    if (sent >= tokenCount) return;
    const t = setTimeout(() => setSent((n) => n + 1), 900);
    return () => clearTimeout(t);
  }, [sent, tokenCount]);

  const keepPct = 100 - ECONOMY.JACKPOT.WINNER_SHARE_BPS / 100;
  // Position of each token among the token rows, to reveal "Sent ✓" in order
  const tokenOrder = win.shares.map((_, i) => win.shares.slice(0, i).filter((x) => x.asset !== 'SOL').length);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-[460px] rounded-xl2 border border-[#FFD700]/30 bg-gradient-to-b from-[#1a1510]/95 to-[#0f0e0a]/95 p-8 shadow-[0_0_60px_rgba(255,215,0,0.15)]"
      >
        <h2 className="text-center font-gothic text-[28px] tracking-[0.08em] text-[#FFD700]">
          The Dead Rise for You
        </h2>
        <p className="mt-3 text-center font-mono text-[30px] font-bold text-[#FFD700]">
          ≈ {win.valueSol.toFixed(2)} SOL
        </p>
        <p className="text-center text-[12px] text-white/40">at 24h average prices</p>

        <ul className="mt-6 space-y-2">
          {win.shares.map((h, i) => {
            const isSol = h.asset === 'SOL';
            const done = isSol || tokenOrder[i] < sent;
            return (
              <li key={h.asset} className="flex items-baseline gap-3 text-[13px]">
                <span className="w-[90px] font-semibold text-ink/90">{h.symbol}</span>
                <span className="font-mono text-white/60">{formatTokenAmount(h)}</span>
                <span className="font-mono text-[#FFD700]/70">{formatHoldingValue(h)}</span>
                <span className={`ml-auto text-[11px] ${done ? 'text-eerie' : 'text-white/40 animate-pulse'}`}>
                  {isSol ? 'Credited ✓' : done ? 'Sent ✓' : 'Sending…'}
                </span>
              </li>
            );
          })}
        </ul>

        <p className="mt-5 text-center text-[11px] text-white/35">
          {keepPct}% stays in the crypt for the next digger.
        </p>

        <button
          onClick={onClose}
          className="spin-btn spin-btn-mint relative mt-6 w-full rounded-[14px] bg-[#1a1725] px-4 py-3 text-[14px] font-bold uppercase tracking-[0.12em] text-[#f0c850] transition-all duration-300"
        >
          <span className="relative z-10">Keep Digging</span>
        </button>
      </motion.div>
    </div>
  );
}
