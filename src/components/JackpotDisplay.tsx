// src/components/JackpotDisplay.tsx
// The crypt bag: total value at TWAP, how many tokens it holds, and the list on click.
'use client';

import { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
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

/** Engraved on the tombstone: jackpot value, token count, age. Toggles the bag popover. */
export function JackpotEngraving({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const jackpot = useGameStore((s) => s.jackpot);
  const now = useNow();

  if (!jackpot) return null;

  const tokenCount = jackpot.holdings.filter((h) => h.asset !== 'SOL').length;

  return (
    <button
      data-jackpot-trigger
      onClick={onToggle}
      aria-expanded={open}
      aria-label="Resurrection jackpot: show the crypt bag"
      className="group flex flex-col items-center rounded-[10px] px-3 py-1.5 transition hover:bg-[#FFD700]/[0.06]"
    >
      <span className="whitespace-nowrap font-cinzel text-[clamp(8px,2.2vw,10px)] font-semibold uppercase tracking-[0.1em] text-[#FFD700]/65">
        Resurrection Jackpot
      </span>
      <span className="mt-1 font-mono text-[clamp(14px,4vw,19px)] font-bold leading-none text-[#FFD700] [text-shadow:0_0_12px_rgba(255,215,0,0.3)]">
        ≈ <AnimatedNumber value={jackpot.valueSol} /> SOL
      </span>
      <span className="mt-1.5 text-[clamp(8px,2.2vw,10px)] text-white/45 transition group-hover:text-white/70">
        {tokenCount} token{tokenCount === 1 ? '' : 's'}{now !== null && ` · ${growingFor(jackpot.growingSince, now)}`}
        <span className="ml-1 text-[#FFD700]/60">{open ? '▴' : '▾'}</span>
      </span>
    </button>
  );
}

/** The crypt bag list. Closes on Escape or a click outside (the trigger toggles it itself). */
export function JackpotBagPopover({ onClose }: { onClose: () => void }) {
  const jackpot = useGameStore((s) => s.jackpot);

  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest('[data-jackpot-popover], [data-jackpot-trigger]')) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (!jackpot) return null;

  const winnerPct = ECONOMY.JACKPOT.WINNER_SHARE_BPS / 100;

  return (
    <motion.div
      data-jackpot-popover
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -6 }}
      transition={{ duration: 0.15 }}
      className="w-[280px] rounded-[14px] border border-[#FFD700]/15 bg-[#0f0e0a]/95 p-4 text-left shadow-panel backdrop-blur-md"
    >
      <p className="font-cinzel text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FFD700]/60">The crypt bag</p>
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
  );
}
