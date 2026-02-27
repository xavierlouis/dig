// src/components/DigHero.tsx
'use client';

import { useGameStore } from '@/store/useGameStore';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => v.toFixed(2));

  useEffect(() => { spring.set(value); }, [value, spring]);

  return <motion.span>{display}</motion.span>;
}

export default function DigHero() {
  const token = useGameStore((s) => s.todaysToken);
  const jackpotBalance = useGameStore((s) => s.jackpotBalance);

  // Fallback while loading
  const coinName = token?.name ?? "$RUGCAT";
  const bornDate = token ? token.born.replace(/^(\w+)\s/, (_, m: string) => m.slice(0, 3) + ' ') : "Jan 2024";
  const diedDate = token ? token.died.replace(/^(\w+)\s/, (_, m: string) => m.slice(0, 3) + ' ') : "Mar 2024";
  const epitaph = token?.epitaph ?? "Promised the moon.\nDelivered a rug.";

  return (
    // Panel: transparent bg, gradient border that fades at top
    <div className="relative border-fade rounded-xl2 overflow-hidden">
      {/* Jackpot pill — top-right */}
      <div className="absolute top-3 right-3 z-20 rounded-full bg-black/50 border border-[#FFD700]/20 px-4 py-1.5">
        <span className="text-sm text-white/60">Jackpot: </span>
        <span className="font-mono text-sm font-bold text-[#FFD700]">
          <AnimatedNumber value={jackpotBalance} /> SOL
        </span>
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
                Today&apos;s Token
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

              {/* Epitaph */}
              <p className="mt-6 mb-auto font-serif text-[clamp(12px,3.4vw,16px)] leading-snug text-center opacity-90 whitespace-pre-line">
                {epitaph}
              </p>
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
    </div>
  );
}
