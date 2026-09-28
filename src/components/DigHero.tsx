// src/components/DigHero.tsx
'use client';

import { useCallback, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { useWeeklyToken } from '@/hooks/useWeeklyToken';
import { formatSol } from '@/lib/game/economy';
import { JackpotBagPopover, JackpotEngraving } from './JackpotDisplay';

export default function DigHero() {
  const token = useWeeklyToken();
  const solSpent = useGameStore((s) => s.jackpot?.buyingNow.solSpentThisWeek ?? 0);
  const [bagOpen, setBagOpen] = useState(false);
  const closeBag = useCallback(() => setBagOpen(false), []);

  // Fallback while loading
  const coinName = token?.name ?? "$RUGCAT";
  const bornDate = token ? token.born.replace(/^(\w+)\s/, (_, m: string) => m.slice(0, 3) + ' ') : "Jan 2024";
  const diedDate = token ? token.died.replace(/^(\w+)\s/, (_, m: string) => m.slice(0, 3) + ' ') : "Mar 2024";

  return (
    // Panel: transparent bg, gradient border that fades at top
    <div className="relative border-fade rounded-xl2 overflow-hidden">
      {/* Crypt bag popover — beside the tombstone, above the grass layer */}
      <div className="absolute top-[88px] left-[calc(50%+162px)] z-30">
        <AnimatePresence>
          {bagOpen && <JackpotBagPopover onClose={closeBag} />}
        </AnimatePresence>
      </div>
      {/* Tomb scene — pt only, no bottom padding so grass is flush */}
      <div className="flex justify-center pt-8">
        {/*
          Tomb container — pb-X controls how high the tomb sits above the grass.
          Current: pb-10. Tweak this value to adjust.
        */}
        <div className="relative w-full max-w-[294px] pb-10">
          {/* Tomb image + text wrapper — text is relative to the tomb only */}
          <div className="relative z-0">
            {/* Layer 1 (back): Tombstone */}
            <img
              src="/graveyard/tomb.png"
              alt=""
              className="w-full h-auto"
              style={{ filter: "drop-shadow(0 0 40px rgba(110,70,200,.25))" }}
              draggable={false}
            />

            {/* Layer 3 (front): Text overlay — sized to tomb image, not container */}
            <div className="absolute inset-0 z-20 flex flex-col items-center px-[18%] pt-[25%] pb-[18%]">
              <p className="text-[clamp(8px,2.2vw,11px)] uppercase tracking-[0.18em] text-muted/70 font-semibold">
                Token of the Week
              </p>

              {/* Coin name */}
              <h2 className="mt-5 text-[clamp(24px,8.5vw,36px)] leading-none font-gothic opacity-80">
                {coinName}
              </h2>

              <p className="mt-3 text-[clamp(8px,2.2vw,11px)] text-torch/80">
                Born: {bornDate} — Died: {diedDate}
              </p>

              {/* Separator */}
              <div className="mt-auto w-[60%] h-px bg-gradient-to-r from-transparent via-muted/30 to-transparent" />

              {/* Resurrection jackpot (click: crypt bag) */}
              <div className="mt-4 mb-auto">
                <JackpotEngraving open={bagOpen} onToggle={() => setBagOpen((o) => !o)} />
              </div>
            </div>
          </div>

          {/* Layer 2 (middle): Ground & grass */}
          <div
            className="absolute bottom-0 left-1/2 z-10 h-[130px] w-screen -translate-x-1/2"
            style={{
              backgroundImage: "url(/graveyard/tomb-bg.png)",
              backgroundSize: "auto 100%",
              backgroundRepeat: "repeat-x",
              backgroundPosition: "center bottom",
            }}
          />
        </div>
      </div>

      {/* Weekly buy pressure — engraved in the grass under the tomb */}
      <div className="absolute inset-x-0 bottom-3 z-20 flex items-center justify-center gap-3 px-4">
        <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#00C853]/50" />
        <p className="font-cinzel text-[12px] font-semibold uppercase tracking-[0.16em] text-white/55">
          Vault bought{' '}
          <span className="font-bold text-[#2bdc79] [text-shadow:0_0_10px_rgba(43,220,121,0.45)]">
            {formatSol(solSpent, 2)} SOL
          </span>{' '}
          of <span className="text-ink/85">{token.name}</span> this week
        </p>
        <span className="h-px w-12 bg-gradient-to-l from-transparent to-[#00C853]/50" />
      </div>
    </div>
  );
}
