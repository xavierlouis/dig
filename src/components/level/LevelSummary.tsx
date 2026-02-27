// src/components/level/LevelSummary.tsx
'use client';

import type { LevelSession, TierName } from '@/services/types';
import { ECONOMY } from '@/config/economy';

interface LevelSummaryProps {
  session: LevelSession;
  maxDigs: number;
  onBuyAnother: () => void;
  onBackToGraveyard: () => void;
}

const TIER_COLORS: Record<TierName, string> = {
  dust: '#6A7BFF',
  bone: '#C8C0D0',
  coffin: '#CD7F32',
  zombie: '#00C853',
  resurrect: '#FFD700',
};

const TIER_LABELS: Record<TierName, string> = {
  dust: 'Dust',
  bone: 'Bone',
  coffin: 'Coffin',
  zombie: 'Zombie',
  resurrect: 'Resurrect',
};

const TIER_EMOJIS: Record<TierName, string> = {
  dust: '\u{1F480}',
  bone: '\u{1F9B4}',
  coffin: '\u26B0\uFE0F',
  zombie: '\u{1F9DF}',
  resurrect: '\u{1F48E}',
};

export default function LevelSummary({ session, maxDigs, onBuyAnother, onBackToGraveyard }: LevelSummaryProps) {
  const levelConfig = ECONOMY.LEVELS[session.level];
  const totalSol = session.tombs.reduce((sum, t) => sum + (t.reveal?.actualPayout ?? 0), 0);
  const tokenChoices = session.tombs.filter((t) => t.reveal?.choice === 'token');
  const tierColors = session.tombs.map((t) => TIER_COLORS[t.reveal?.tier ?? 'dust']);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-[480px] rounded-xl2 p-8 bg-gradient-to-b from-[#1A1A3E]/95 to-[#0A0A1A]/95 shadow-panel animate-[tierShift_4s_ease-in-out_infinite]"
        style={{
          '--tier-0': tierColors[0],
          '--tier-1': tierColors[1],
          '--tier-2': tierColors[2],
        } as React.CSSProperties}
      >
        {/* Header */}
        <h2 className="text-center font-gothic text-[24px] tracking-[0.08em] text-ink">
          {maxDigs < 3 ? 'Round Complete' : "You're Out of Pickaxes!"}
        </h2>

        {/* Tomb results */}
        <div className="mt-6 flex justify-center gap-4">
          {session.tombs.map((tomb) => {
            const wasLocked = tomb.index >= maxDigs;
            const tier = tomb.reveal?.tier ?? 'dust';
            const choice = tomb.reveal?.choice;
            const payout = tomb.reveal?.actualPayout ?? 0;

            if (wasLocked) {
              return (
                <div key={tomb.index} className="flex flex-col items-center gap-1.5 opacity-30">
                  <div className="flex h-[80px] w-[80px] items-center justify-center rounded-[12px] border border-muted/20 bg-muted/5">
                    <span className="text-[11px] font-bold uppercase text-muted/40">—</span>
                  </div>
                  <span className="text-[11px] font-mono text-muted/30">Locked</span>
                </div>
              );
            }

            return (
              <div key={tomb.index} className="flex flex-col items-center gap-1.5">
                <div
                  className="flex h-[80px] w-[80px] flex-col items-center justify-center gap-1 rounded-[12px] border"
                  style={{
                    borderColor: TIER_COLORS[tier] + '40',
                    background: TIER_COLORS[tier] + '15',
                  }}
                >
                  <span className="text-[24px] leading-none">{TIER_EMOJIS[tier]}</span>
                  <span className="text-[11px] font-bold uppercase" style={{ color: TIER_COLORS[tier] }}>
                    {TIER_LABELS[tier]}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-eerie">
                  {payout > 0 ? `+${payout.toFixed(3)} SOL` : '0 SOL'}
                </span>
                {choice && choice !== 'sol' && tier !== 'dust' && tier !== 'bone' && (
                  <span className="text-[10px] font-semibold uppercase text-[#00C853]/70">
                    Chose Token
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Stats */}
        <div className="mt-6 space-y-2 text-center">
          <p className="text-[15px]">
            <span className="text-ink/90">Total Won: </span>
            <span className={`font-mono font-bold ${totalSol > 0 ? 'text-eerie' : 'text-muted/40'}`}>
              {totalSol.toFixed(3)} SOL
            </span>
          </p>
          {tokenChoices.length > 0 && (
            <p className="text-[13px] text-muted/50">
              {tokenChoices.length} token reward{tokenChoices.length > 1 ? 's' : ''} chosen
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={onBuyAnother}
            className="spin-btn spin-btn-mint w-full rounded-[14px] bg-[#1a1725] px-4 py-3 text-[14px] font-bold uppercase tracking-[0.12em] text-[#f0c850] transition-all duration-300"
          >
            <span className="relative z-10">Buy Pickaxe Pack – {levelConfig.price} SOL</span>
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
