// src/components/JackpotDisplay.tsx
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

export default function JackpotDisplay() {
  const jackpotBalance = useGameStore((s) => s.jackpotBalance);

  return (
    <div className="relative flex flex-col items-center rounded-xl2 border border-[#FFD700]/15 bg-gradient-to-b from-[#1a1510]/60 to-[#0f0e0a]/60 px-6 py-4">
      {/* Gold glow pulse */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-xl2"
        animate={{ opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: 'radial-gradient(ellipse at center, rgba(255,215,0,0.12), transparent 70%)',
        }}
      />

      <span className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-[#FFD700]/60">
        Resurrection Jackpot
      </span>
      <span className="relative mt-1 font-mono text-[32px] font-bold leading-none tracking-tight text-[#FFD700]">
        <AnimatedNumber value={jackpotBalance} /> SOL
      </span>
    </div>
  );
}
