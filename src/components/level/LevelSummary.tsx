// src/components/level/LevelSummary.tsx
// Session summary, shown when the player leaves the level.
'use client';

import type { TierName } from '@/services/types';
import type { SessionStats } from '@/store/useGameStore';
import { TIER_ORDER, formatSol } from '@/lib/game/economy';

interface LevelSummaryProps {
  stats: SessionStats;
  credit: number;
  onTopUp: () => void;
  onBackToGraveyard: () => void;
}

export const TIER_COLORS: Record<TierName, string> = {
  dust: '#6A7BFF',
  bone: '#C8C0D0',
  coffin: '#CD7F32',
  zombie: '#00C853',
  resurrect: '#FFD700',
};

export const TIER_LABELS: Record<TierName, string> = {
  dust: 'Dust',
  bone: 'Bone',
  coffin: 'Coffin',
  zombie: 'Zombie',
  resurrect: 'Resurrect',
};

const TIER_EMOJIS: Record<TierName, string> = {
  dust: '\u{1F480}',
  bone: '\u{1F9B4}',
  coffin: '⚰️',
  zombie: '\u{1F9DF}',
  resurrect: '\u{1F48E}',
};

export default function LevelSummary({ stats, credit, onTopUp, onBackToGraveyard }: LevelSummaryProps) {
  const best = stats.best ?? 'dust';
  const net = stats.won - stats.wagered;
  const bestColor = TIER_COLORS[best];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-[480px] rounded-xl2 p-8 bg-gradient-to-b from-[#1A1A3E]/95 to-[#0A0A1A]/95 shadow-panel animate-[tierShift_4s_ease-in-out_infinite]"
        style={{ '--tier-0': bestColor, '--tier-1': bestColor + 'aa', '--tier-2': bestColor + '66' } as React.CSSProperties}
      >
        <h2 className="text-center font-gothic text-[24px] tracking-[0.08em] text-ink">
          You Climb Back to the Surface
        </h2>

        {/* Best find */}
        <div className="mt-6 flex justify-center">
          <div
            className="flex h-[88px] w-[88px] flex-col items-center justify-center gap-1 rounded-[12px] border"
            style={{ borderColor: bestColor + '40', background: bestColor + '15' }}
          >
            <span className="text-[26px] leading-none">{TIER_EMOJIS[best]}</span>
            <span className="text-[11px] font-bold uppercase" style={{ color: bestColor }}>{TIER_LABELS[best]}</span>
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] uppercase tracking-[0.14em] text-muted/40">Best find</p>

        {/* Tier counts */}
        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12px]">
          {TIER_ORDER.filter((t) => stats.tiers[t] > 0).map((t) => (
            <span key={t} style={{ color: TIER_COLORS[t] }}>
              {TIER_LABELS[t]} ×{stats.tiers[t]}
            </span>
          ))}
        </div>

        {/* Stats */}
        <dl className="mx-auto mt-6 grid max-w-[280px] grid-cols-2 gap-y-1.5 font-mono text-[13px]">
          <dt className="text-muted/50">Digs</dt><dd className="text-right text-ink">{stats.digs}</dd>
          <dt className="text-muted/50">Wagered</dt><dd className="text-right text-ink">{formatSol(stats.wagered)} SOL</dd>
          <dt className="text-muted/50">Won</dt><dd className="text-right text-ink">{formatSol(stats.won)} SOL</dd>
          <dt className="text-muted/50">Net</dt>
          <dd className={`text-right font-bold ${net > 0 ? 'text-eerie' : 'text-muted/60'}`}>
            {net >= 0 ? '+' : '−'}{formatSol(Math.abs(net))} SOL
          </dd>
          {stats.jackpotValueSol > 0 && (
            <>
              <dt className="text-[#FFD700]/70">Jackpot</dt>
              <dd className="text-right text-[#FFD700]">≈ {stats.jackpotValueSol.toFixed(2)} SOL</dd>
            </>
          )}
          <dt className="text-muted/50">Credit left</dt><dd className="text-right text-ink">{formatSol(credit)} SOL</dd>
        </dl>

        {/* Buttons */}
        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={onTopUp}
            className="spin-btn spin-btn-mint w-full rounded-[14px] bg-[#1a1725] px-4 py-3 text-[14px] font-bold uppercase tracking-[0.12em] text-[#f0c850] transition-all duration-300"
          >
            <span className="relative z-10">Top Up &amp; Keep Digging</span>
          </button>
          <button
            onClick={onBackToGraveyard}
            className="w-full rounded-[14px] border border-muted/15 px-4 py-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted/60 transition hover:text-ink hover:border-muted/30"
          >
            Back to Graveyard
          </button>
        </div>
      </div>
    </div>
  );
}
