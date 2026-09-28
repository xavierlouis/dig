// src/components/PackShop.tsx
'use client';

import { useGameStore } from '@/store/useGameStore';
import { useRouter } from 'next/navigation';
import type { LevelId } from '@/services/types';
import { ECONOMY } from '@/config/economy';
import { formatSol, priceOf } from '@/lib/game/economy';
import { SoundEngine } from '@/lib/sound';

const levels: {
  level: number;
  levelId: LevelId;
  name: string;
  tool: string;
  toolImg: string;
  levelImg: string;
}[] = [
  {
    level: 1,
    levelId: 'shallow_grave',
    name: "Shallow Graves",
    tool: "Pickaxe",
    toolImg: "/graveyard/pickaxe.png",
    levelImg: "/graveyard/level-1-640.png",
  },
  {
    level: 2,
    levelId: 'deep_crypt',
    name: "Deep Crypt",
    tool: "Lamp",
    toolImg: "/graveyard/lamp.png",
    levelImg: "/graveyard/level-2-640.png",
  },
  {
    level: 3,
    levelId: 'ancient_vault',
    name: "Ancient Vault",
    tool: "Crypt Key",
    toolImg: "/graveyard/crypt-key.png",
    levelImg: "/graveyard/level-3-640.png",
  },
];

export default function PackShop() {
  const router = useRouter();
  const walletConnected = useGameStore((s) => s.walletConnected);
  const credit = useGameStore((s) => s.account?.credit ?? 0);
  const signedIn = useGameStore((s) => s.account !== null);
  const startLevel = useGameStore((s) => s.startLevel);
  const openModal = useGameStore((s) => s.openModal);

  const handleEnter = (levelId: LevelId) => {
    SoundEngine.play('enterLevel');
    startLevel(levelId);
    router.push('/level');
  };

  return (
    <div className="rounded-xl2 border border-muted/20 bg-gradient-to-b from-stone/30 to-grave/30 p-5 shadow-panel">
      <div className="text-center">
        <div className="font-gothic text-[28px] tracking-[0.08em] leading-none">
          Choose Your Descent
        </div>
        <div className="mt-2 text-[13px] font-medium tracking-[0.04em] text-muted/60">
          Fill your purse once. Dig until it runs dry. Resurrect the fallen.
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-6">
        {levels.map((lvl) => {
          const price = priceOf(lvl.levelId);
          const locked = ECONOMY.LEVELS[lvl.levelId].locked;
          const canEnter = signedIn && credit >= price;

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
              </div>

              {/* Info + button */}
              <div
                className="rounded-b-xl2 border-t border-muted/10 px-4 py-4 text-center"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(26,23,37,.9), rgba(7,6,11,.95))",
                }}
              >
                {!locked ? (
                  <>
                    <p className="text-[11px] text-muted/40 tracking-[0.02em]">
                      Each dig opens one tomb, paid from your credit
                    </p>

                    <div className="my-3 h-px w-full bg-gradient-to-r from-transparent via-muted/20 to-transparent" />

                    {/* Tool image — tweak h-[64px] to resize */}
                    <div className="flex justify-center mb-3">
                      <img
                        src={lvl.toolImg}
                        alt={lvl.tool}
                        className="h-[64px] w-auto object-contain transition-[filter] duration-300 group-hover:[filter:drop-shadow(0_0_8px_rgba(255,170,60,.45))]"
                        draggable={false}
                      />
                    </div>

                    {canEnter ? (
                      <button
                        onClick={() => handleEnter(lvl.levelId)}
                        className="spin-btn spin-btn-enter relative w-full rounded-[14px] bg-[#1a1725] px-4 py-3 text-[14px] font-bold uppercase tracking-[0.12em] text-[#FF9B3D] transition-all duration-300"
                      >
                        <span className="relative z-10">Enter — {formatSol(price)} SOL / dig</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => signedIn && openModal('deposit')}
                        disabled={!signedIn}
                        className="spin-btn spin-btn-mint relative w-full rounded-[14px] bg-[#1a1725] px-4 py-3 text-[14px] font-bold uppercase tracking-[0.12em] text-[#f0c850] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="relative z-10">{walletConnected ? 'Deposit to Dig' : 'Connect Wallet'}</span>
                      </button>
                    )}

                    <div className="mt-2 text-[13px] font-bold tracking-[0.04em] text-[#f0c850]">
                      {formatSol(price)} SOL per dig
                    </div>
                    <p className="mt-1 text-[11px] text-muted/40 tracking-[0.02em]">
                      Wins land instantly as credit
                    </p>
                  </>
                ) : (
                  <>
                    {/* Requirement hint */}
                    <p className="text-[11px] text-muted/40 tracking-[0.02em]">
                      {formatSol(price)} SOL per dig · bigger wins, same odds
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
                  !locked ? "bg-blue-500/15" : "bg-red-500/15"
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
