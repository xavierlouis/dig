// src/components/PackShop.tsx
'use client';

import { useGameStore } from '@/store/useGameStore';
import { digService, addBuyPressure } from '@/services';
import { ECONOMY } from '@/config/economy';
import { calculateSplits } from '@/lib/economy';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { LevelId } from '@/services/types';
import { SoundEngine } from '@/lib/sound';

const USE_BLOCKCHAIN = process.env.NEXT_PUBLIC_USE_BLOCKCHAIN === 'true';

const levels: {
  level: number;
  levelId: LevelId;
  name: string;
  tool: string;
  pack: string;
  toolImg: string;
  levelImg: string;
  price: string;
}[] = [
  {
    level: 1,
    levelId: 'shallow_grave',
    name: "Shallow Graves",
    tool: "Pickaxe",
    pack: "Pickaxe Pack",
    toolImg: "/graveyard/pickaxe.png",
    levelImg: "/graveyard/level-1-640.png",
    price: "0.06 SOL",
  },
  {
    level: 2,
    levelId: 'deep_crypt',
    name: "Deep Crypt",
    tool: "Lamp",
    pack: "Lamp Pack",
    toolImg: "/graveyard/lamp.png",
    levelImg: "/graveyard/level-2-640.png",
    price: "0.15 SOL",
  },
  {
    level: 3,
    levelId: 'ancient_vault',
    name: "Ancient Vault",
    tool: "Crypt Key",
    pack: "Legendary Key",
    toolImg: "/graveyard/crypt-key.png",
    levelImg: "/graveyard/level-3-640.png",
    price: "0.50 SOL",
  },
];

export default function PackShop() {
  const router = useRouter();
  const walletConnected = useGameStore((s) => s.walletConnected);
  const balance = useGameStore((s) => s.balance);
  const digBalance = useGameStore((s) => s.digBalance);
  const setDigBalance = useGameStore((s) => s.setDigBalance);
  const deductBalance = useGameStore((s) => s.deductBalance);
  const setActiveSession = useGameStore((s) => s.setActiveSession);
  const setGamePhase = useGameStore((s) => s.setGamePhase);
  const setJackpotBalance = useGameStore((s) => s.setJackpotBalance);
  const jackpotBalance = useGameStore((s) => s.jackpotBalance);

  const [loading, setLoading] = useState<string | null>(null);

  const handleMint = async (levelId: LevelId) => {
    if (!walletConnected) return;
    const config = ECONOMY.LEVELS[levelId];
    if (balance < config.price) return;

    setLoading(levelId);
    try {
      // In mock mode, optimistically update UI balances.
      // In blockchain mode, refreshBalances() inside the service handles it.
      if (!USE_BLOCKCHAIN) {
        deductBalance(config.price);
      }

      // Update economy pools
      const splits = calculateSplits(levelId);
      setJackpotBalance(jackpotBalance + splits.jackpot);
      addBuyPressure(splits.tokenBuy);

      // Mint digs (blockchain: SOL transfer + SPL mint + refreshBalances)
      const newBalance = await digService.mintDigs(levelId, ECONOMY.DIGS_PER_PACK);
      if (!USE_BLOCKCHAIN) {
        setDigBalance(newBalance);
      }
    } finally {
      setLoading(null);
    }
  };

  const handleEnter = async (levelId: LevelId) => {
    if (digBalance <= 0) return;

    SoundEngine.play('enterLevel');
    setLoading(levelId);
    try {
      const session = await digService.startRound(levelId);
      setActiveSession(session);
      setGamePhase('level');
      router.push('/level');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="rounded-xl2 border border-muted/20 bg-gradient-to-b from-stone/30 to-grave/30 p-5 shadow-panel">
      <div className="text-center">
        <div className="font-gothic text-[28px] tracking-[0.08em] leading-none">
          Choose Your Descent
        </div>
        <div className="mt-2 text-[13px] font-medium tracking-[0.04em] text-muted/60">
          Equip your tools. Unearth treasures. Resurrect the fallen.
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-6">
        {levels.map((lvl) => {
          const isProcessing = loading === lvl.levelId;
          const canMint = walletConnected && balance >= ECONOMY.LEVELS[lvl.levelId].price;

          return (
            <div
              key={lvl.level}
              className="group relative w-full max-w-[320px] transition-all duration-300 ease-out hover:-translate-y-1"
            >
              {/* Level name — top */}
              <div
                className="rounded-t-xl2 border-b border-muted/10 px-4 py-3 text-center"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(26,23,37,.95), rgba(14,12,22,.9))",
                }}
              >
                <div className="font-gothic text-[24px] tracking-[0.06em] leading-tight">
                  {lvl.name}
                </div>
              </div>

              {/* Level image area */}
              <div
                className="relative flex h-[300px] items-center justify-center overflow-hidden"
                style={{
                  background:
                    "radial-gradient(circle at 50% 60%, rgba(42,36,54,.6), rgba(7,6,11,.95))",
                }}
              >
                {lvl.levelImg && (
                  <img
                    src={lvl.levelImg}
                    alt={lvl.name}
                    className="relative z-10 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    draggable={false}
                  />
                )}
                {/* Enter button overlay */}
                {lvl.level === 1 && digBalance > 0 && (
                  <div className="absolute bottom-3 left-3 right-3 z-20">
                    <button
                      onClick={() => handleEnter(lvl.levelId)}
                      disabled={isProcessing}
                      className="spin-btn spin-btn-enter relative w-full rounded-[14px] bg-[#1a1725]/40 backdrop-blur-sm px-4 py-3 text-[14px] font-bold uppercase tracking-[0.12em] text-[#FF9B3D] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="relative z-10">
                        {isProcessing ? 'Entering...' : 'Enter Level'}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Info + button */}
              <div
                className="rounded-b-xl2 border-t border-muted/10 px-4 py-4 text-center"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(26,23,37,.9), rgba(7,6,11,.95))",
                }}
              >
                {lvl.level === 1 ? (
                  <>
                    {/* Requirement hint */}
                    <p className="text-[11px] text-muted/40 tracking-[0.02em]">
                      A {lvl.pack} is required to enter this level
                    </p>

                    {/* Pack inventory */}
                    {digBalance > 0 && (
                      <div className="mt-2 flex items-center justify-center gap-1.5 text-[12px] text-muted/50 tracking-[0.04em]">
                        <span>You own:</span>
                        <span className="font-[var(--font-pirata)] text-[13px] text-[#FF9B3D]">
                          {lvl.pack}
                        </span>
                        <img
                          src="/graveyard/pickaxe.png"
                          alt=""
                          className="h-[14px] w-auto object-contain drop-shadow-[0_0_4px_rgba(255,155,61,0.4)]"
                          draggable={false}
                        />
                        <span className="font-[var(--font-pirata)] text-[13px] text-[#FF9B3D]">
                          &times; {Math.floor(digBalance / 3)}
                        </span>
                      </div>
                    )}

                    <div className="my-3 h-px w-full bg-gradient-to-r from-transparent via-muted/20 to-transparent" />

                    {/* Tool image — tweak h-[48px] to resize */}
                    <div className="flex justify-center mb-3">
                      <img
                        src={lvl.toolImg}
                        alt={lvl.tool}
                        className="h-[64px] w-auto object-contain transition-[filter] duration-300 group-hover:[filter:drop-shadow(0_0_8px_rgba(255,170,60,.45))]"
                        draggable={false}
                      />
                    </div>

                    {/* Mint button */}
                    <button
                      onClick={() => handleMint(lvl.levelId)}
                      disabled={isProcessing || !canMint}
                      className="spin-btn spin-btn-mint relative w-full rounded-[14px] bg-[#1a1725] px-4 py-3 text-[14px] font-bold uppercase tracking-[0.12em] text-[#f0c850] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="relative z-10">
                        {isProcessing && loading === lvl.levelId && !digBalance ? 'Minting...' : !walletConnected ? 'Connect Wallet' : 'Mint Pickaxe Pack'}
                      </span>
                    </button>

                    {/* Price + description */}
                    <div className="mt-2 text-[13px] font-bold tracking-[0.04em] text-[#f0c850]">
                      {lvl.price}
                    </div>
                    <p className="mt-1 text-[11px] text-muted/40 tracking-[0.02em]">
                      Contains 3 pickaxes, allowing 3 digs
                    </p>
                  </>
                ) : (
                  <>
                    {/* Requirement hint */}
                    <p className="text-[11px] text-muted/40 tracking-[0.02em]">
                      A {lvl.pack} is required to enter this level
                    </p>

                    <div className="my-3 h-px w-full bg-gradient-to-r from-transparent via-muted/20 to-transparent" />

                    {/* Tool image — tweak h-[64px] to resize */}
                    <div className="flex justify-center mb-3">
                      <img
                        src={lvl.toolImg}
                        alt={lvl.tool}
                        className="h-[64px] w-auto object-contain opacity-40"
                        draggable={false}
                      />
                    </div>

                    <button className="w-full rounded-[14px] bg-gradient-to-b from-[#252230] to-[#1a1824] border border-muted/15 px-4 py-2.5 text-[13px] font-bold uppercase tracking-[0.08em] text-muted/35 cursor-not-allowed flex items-center justify-center gap-1.5" disabled>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <rect x="3" y="11" width="18" height="11" rx="2" fill="currentColor" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                      Coming Soon
                    </button>
                  </>
                )}
              </div>

              {/* Hover glow */}
              <div
                className={`pointer-events-none absolute -inset-1 -z-10 rounded-xl2 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100 ${
                  lvl.level === 1 ? "bg-blue-500/15" : "bg-red-500/15"
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
