// src/components/JackpotDisplay.tsx
// The crypt bag: total value at TWAP, how many tokens it holds, and the list on click.
'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useSpring, useTransform } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { formatSol } from '@/lib/game/economy';
import { ECONOMY } from '@/config/economy';
import type { JackpotHolding } from '@/services/types';
import { useNow } from '@/hooks/useNow';

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => v.toFixed(2));

  useEffect(() => { spring.set(value); }, [value, spring]);

  return <motion.span>{display}</motion.span>;
}

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

export function formatTokenAmount(h: JackpotHolding): string {
  return h.asset === 'SOL' ? formatSol(h.amount) : compact.format(h.amount / 10 ** h.decimals);
}

export function formatHoldingValue(h: JackpotHolding): string {
  return h.valueSol === null ? '≈ ?' : `≈ ${h.valueSol.toFixed(2)} SOL`;
}

function growingFor(since: number, now: number): string {
  const hours = Math.floor((now - since) / 3_600_000);
  if (hours < 1) return 'just reseeded';
  if (hours < 48) return `growing for ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `growing for ${days} days`;
  return `growing for ${Math.floor(days / 7)} weeks`;
}

export default function JackpotDisplay() {
  const jackpot = useGameStore((s) => s.jackpot);
  const [open, setOpen] = useState(false);
  const now = useNow();

  if (!jackpot) return null;

  const tokenCount = jackpot.holdings.filter((h) => h.asset !== 'SOL').length;
  const winnerPct = ECONOMY.JACKPOT.WINNER_SHARE_BPS / 100;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex flex-col items-end rounded-[14px] border border-[#FFD700]/20 bg-black/50 px-4 py-2 text-right backdrop-blur-sm transition hover:border-[#FFD700]/40"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FFD700]/60">Resurrection Jackpot</span>
        <span className="font-mono text-[16px] font-bold leading-tight text-[#FFD700]">
          ≈ <AnimatedNumber value={jackpot.valueSol} /> SOL
        </span>
        <span className="text-[10px] text-white/40">
          {tokenCount} token{tokenCount === 1 ? '' : 's'}{now !== null && ` · ${growingFor(jackpot.growingSince, now)}`}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-30 mt-2 w-[280px] rounded-[14px] border border-[#FFD700]/15 bg-[#0f0e0a]/95 p-4 text-left shadow-panel backdrop-blur-md"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FFD700]/60">The crypt bag</p>
            <ul className="mt-2 space-y-1.5">
              {jackpot.holdings.map((h) => (
                <li key={h.asset} className="flex items-baseline justify-between gap-3 text-[12px]">
                  <span className="font-semibold text-ink/90">{h.symbol}</span>
                  <span className="font-mono text-white/50">{formatTokenAmount(h)}</span>
                  <span className={`ml-auto font-mono ${h.valueSol === null ? 'text-white/30' : 'text-[#FFD700]/80'}`}>
                    {formatHoldingValue(h)}
                  </span>
                </li>
              ))}
              {jackpot.holdings.length === 0 && <li className="text-[12px] text-white/40">Empty</li>}
            </ul>
            <div className="my-3 h-px bg-gradient-to-r from-transparent via-[#FFD700]/20 to-transparent" />
            <p className="text-[11px] leading-relaxed text-white/45">
              {jackpot.buyingNow.token
                ? <>Buying <span className="text-ink/80">{jackpot.buyingNow.token.name}</span> this week · {formatSol(jackpot.buyingNow.solSpentThisWeek, 2)} SOL spent. </>
                : <>This week&apos;s share stays in SOL. </>}
              A Resurrect wins {winnerPct}% of everything; the rest seeds the next jackpot.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
