// src/components/level/RewardChoice.tsx
'use client';

import { useState, useEffect } from 'react';
import type { TombReveal } from '@/services/types';

interface RewardChoiceProps {
  reveal: TombReveal;
  tokenSymbol: string;
  onChoice: (choice: 'sol' | 'token') => void;
}

export default function RewardChoice({ reveal, tokenSymbol, onChoice }: RewardChoiceProps) {
  const [chosen, setChosen] = useState<'sol' | 'token' | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  // Show "CHOOSE YOUR FATE" after 3s
  useEffect(() => {
    const timer = setTimeout(() => setShowPrompt(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleChoice = (choice: 'sol' | 'token') => {
    if (chosen) return;
    setChosen(choice);
    setTimeout(() => onChoice(choice), 600);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative flex flex-col items-center gap-6">
        {/* Prompt */}
        {showPrompt && !chosen && (
          <p className="font-gothic text-[18px] tracking-[0.1em] text-ink/50 animate-pulse">
            Choose Your Fate
          </p>
        )}

        <div className="flex gap-8">
          {/* Option A: SOL */}
          <button
            onClick={() => handleChoice('sol')}
            disabled={!!chosen}
            className={`group flex w-[220px] flex-col items-center gap-3 rounded-xl2 border px-6 py-6 transition-all duration-500 ${
              chosen === 'sol'
                ? 'scale-110 border-[#6C63FF]/60 bg-[#6C63FF]/15 shadow-[0_0_40px_rgba(108,99,255,0.3)]'
                : chosen === 'token'
                ? 'scale-90 opacity-20 border-muted/10 bg-black/20'
                : 'border-[#6C63FF]/25 bg-[#12122A]/80 hover:border-[#6C63FF]/50 hover:bg-[#6C63FF]/10 hover:shadow-[0_0_30px_rgba(108,99,255,0.15)]'
            }`}
          >
            {/* Orb */}
            <div
              className="relative flex h-[76px] w-[76px] items-center justify-center rounded-full shadow-[0_0_20px_rgba(108,99,255,0.25)]"
              style={{ background: 'radial-gradient(circle, rgba(108,99,255,0.4) 30%, rgba(108,99,255,0.15) 60%, transparent 100%)' }}
            >
              <div className="h-[52px] w-[52px] rounded-full bg-gradient-to-br from-[#8B83FF] to-[#6C63FF] animate-pulse shadow-[0_0_16px_rgba(108,99,255,0.5)]" />
              <span className="absolute inset-0 flex items-center justify-center font-bold text-[16px] tracking-[0.06em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">SOL</span>
            </div>

            <span className="font-gothic text-[14px] uppercase tracking-[0.08em] text-[#8B83FF]">
              Cash the Grave
            </span>
            <span className="font-mono text-[22px] font-bold text-ink">
              {reveal.solPayout.toFixed(3)} SOL
            </span>
          </button>

          {/* Option B: Token */}
          <button
            onClick={() => handleChoice('token')}
            disabled={!!chosen}
            className={`group flex w-[220px] flex-col items-center gap-3 rounded-xl2 border px-6 py-6 transition-all duration-500 ${
              chosen === 'token'
                ? 'scale-110 border-[#00C853]/60 bg-[#00C853]/15 shadow-[0_0_40px_rgba(0,200,83,0.3)]'
                : chosen === 'sol'
                ? 'scale-90 opacity-20 border-muted/10 bg-black/20'
                : 'border-[#00C853]/25 bg-[#12122A]/80 hover:border-[#00C853]/50 hover:bg-[#00C853]/10 hover:shadow-[0_0_30px_rgba(0,200,83,0.15)]'
            }`}
          >
            {/* Orb */}
            <div
              className="relative flex h-[76px] w-[76px] items-center justify-center rounded-full shadow-[0_0_20px_rgba(0,200,83,0.25)]"
              style={{ background: 'radial-gradient(circle, rgba(0,200,83,0.4) 30%, rgba(0,200,83,0.15) 60%, transparent 100%)' }}
            >
              <div className="h-[52px] w-[52px] rounded-full bg-gradient-to-br from-[#69F0AE] to-[#00C853] animate-pulse shadow-[0_0_16px_rgba(0,200,83,0.5)]" />
              <span className="absolute inset-0 flex items-center justify-center font-bold text-[13px] tracking-[0.04em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">TOKEN</span>
            </div>

            <span className="font-gothic text-[14px] uppercase tracking-[0.08em] text-[#00C853]">
              Ride the Resurrection
            </span>
            <span className="font-mono text-[22px] font-bold text-ink">
              ~{reveal.tokenPayout.toFixed(3)} SOL
            </span>
            <span className="text-[11px] font-semibold text-[#00C853]/80">
              of {tokenSymbol} • +33% more
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
