// src/app/level/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGameStore } from '@/store/useGameStore';
import { digService, addBuyPressure } from '@/services';
import { getTokenById } from '@/config/tokens';
import { ECONOMY } from '@/config/economy';
import { calculateSplits } from '@/lib/economy';
import LevelCanvas from '@/components/level/LevelCanvas';
import RewardChoice from '@/components/level/RewardChoice';
import LevelSummary from '@/components/level/LevelSummary';
import Image from 'next/image';
import type { TombReveal, TierName } from '@/services/types';
import SolToast, { showSolToast } from '@/components/ui/SolToast';
import SoundToggle from '@/components/ui/SoundToggle';
import { SoundEngine } from '@/lib/sound';

const USE_BLOCKCHAIN = process.env.NEXT_PUBLIC_USE_BLOCKCHAIN === 'true';

type LevelPhase = 'playing' | 'choosing' | 'summary';

const TIER_INFO: { name: string; color: string; payout: string }[] = [
  { name: 'Dust',      color: '#6A7BFF', payout: '0 SOL' },
  { name: 'Bone',      color: '#C8C0D0', payout: '0.005 SOL' },
  { name: 'Coffin',    color: '#CD7F32', payout: '0.03 SOL' },
  { name: 'Zombie',    color: '#00C853', payout: '0.10 SOL' },
  { name: 'Resurrect', color: '#FFD700', payout: 'Jackpot' },
];

export default function LevelPage() {
  const router = useRouter();
  const session = useGameStore((s) => s.activeSession);
  const todaysToken = useGameStore((s) => s.todaysToken);
  const digBalance = useGameStore((s) => s.digBalance);
  const decrementDigBalance = useGameStore((s) => s.decrementDigBalance);
  const setDigBalance = useGameStore((s) => s.setDigBalance);
  const updateTombReveal = useGameStore((s) => s.updateTombReveal);
  const updateTombChoice = useGameStore((s) => s.updateTombChoice);
  const addBalance = useGameStore((s) => s.addBalance);
  const deductBalance = useGameStore((s) => s.deductBalance);
  const setActiveSession = useGameStore((s) => s.setActiveSession);
  const setGamePhase = useGameStore((s) => s.setGamePhase);
  const jackpotBalance = useGameStore((s) => s.jackpotBalance);
  const setJackpotBalance = useGameStore((s) => s.setJackpotBalance);

  const [levelPhase, setLevelPhase] = useState<LevelPhase>('playing');
  const [currentReveal, setCurrentReveal] = useState<TombReveal | null>(null);
  const [pendingReveal, setPendingReveal] = useState<TombReveal | null>(null);
  const [precomputedReveals, setPrecomputedReveals] = useState<TombReveal[] | null>(null);
  const [choosingIndex, setChoosingIndex] = useState(-1);
  const [tombsCompleted, setTombsCompleted] = useState(0);
  const [choiceResults, setChoiceResults] = useState<Record<number, { choice: 'sol' | 'token'; payout: number }>>({});

  // How many tombs the player can open this round
  const walletAddress = useGameStore((s) => s.walletAddress);
  const balance = useGameStore((s) => s.balance);

  const [maxDigs, setMaxDigs] = useState(() => Math.min(digBalance, 3));

  // Visual pickaxe counter: decrements 1 per tomb (not tied to on-chain balance which drops to 0 after batch burn)
  const visualDigs = maxDigs - tombsCompleted;

  // Redirect to home if no session
  useEffect(() => {
    if (!session) {
      router.replace('/');
    }
  }, [session, router]);

  // Ambient music — play on mount, stop on unmount
  useEffect(() => {
    SoundEngine.play('graveyardLoop');
    return () => { SoundEngine.stop('graveyardLoop'); };
  }, []);

  const token = todaysToken ?? (session ? getTokenById(session.tokenId) ?? null : null);

  const handleTombTapped = useCallback(async (index: number) => {
    if (!session) return;
    try {
      let reveal: TombReveal;

      if (!precomputedReveals) {
        // First tomb tap: burn all digs, pre-compute all reveals
        const allReveals = await digService.digAll(session.id);
        setPrecomputedReveals(allReveals);
        if (!USE_BLOCKCHAIN) {
          setDigBalance(Math.max(0, digBalance - allReveals.length));
        }
        reveal = allReveals[index]!;
      } else {
        // Subsequent taps: read from pre-computed array (instant, no tx)
        reveal = precomputedReveals[index]!;
      }

      updateTombReveal(index, reveal);
      setPendingReveal(reveal);
      setCurrentReveal(reveal);
    } catch (err) {
      console.error('Failed to dig tomb:', err);
    }
  }, [session, precomputedReveals, digBalance, updateTombReveal, setDigBalance]);

  const handleTierRevealed = useCallback((_index: number, _tier: TierName) => {
    // Canvas finished showing tier animation
  }, []);

  const handleChoiceReady = useCallback((index: number) => {
    setChoosingIndex(index);
    setLevelPhase('choosing');
  }, []);

  const handleAutoAdvance = useCallback(async (index: number) => {
    // Dust/Bone auto-advance: credit payout and move on
    if (currentReveal) {
      const payout = currentReveal.solPayout;
      if (USE_BLOCKCHAIN) {
        // Server-side claim (skips if payout=0 for Dust)
        try {
          await digService.claimReward(currentReveal.id, 'sol');
          showSolToast(payout);
        } catch {
          // best-effort
        }
      } else {
        if (payout > 0) {
          addBalance(payout);
        }
        showSolToast(payout);
      }
      updateTombChoice(index, 'sol', payout);
    }
    const completed = tombsCompleted + 1;
    setTombsCompleted(completed);
    setPendingReveal(null);
    setCurrentReveal(null);

    if (completed >= maxDigs) {
      setTimeout(() => setLevelPhase('summary'), 800);
    }
  }, [currentReveal, tombsCompleted, maxDigs, addBalance, updateTombChoice]);

  const handleChoice = useCallback(async (choice: 'sol' | 'token') => {
    if (!currentReveal) return;
    const payout = choice === 'sol' ? currentReveal.solPayout : currentReveal.tokenPayout;
    try {
      await digService.claimReward(currentReveal.id, choice);
      // Mock mode: manually credit. Blockchain mode: refreshBalances handles it.
      if (!USE_BLOCKCHAIN) {
        addBalance(payout);
      }
      showSolToast(payout);
    } catch (err) {
      console.error('Failed to claim reward:', err);
    }

    // Record choice in store and for canvas
    updateTombChoice(choosingIndex, choice, payout);
    setChoiceResults((prev) => ({ ...prev, [choosingIndex]: { choice, payout } }));

    setLevelPhase('playing');
    setChoosingIndex(-1);
    setPendingReveal(null);
    setCurrentReveal(null);

    const completed = tombsCompleted + 1;
    setTombsCompleted(completed);

    if (completed >= maxDigs) {
      setTimeout(() => setLevelPhase('summary'), 800);
    }
  }, [currentReveal, choosingIndex, tombsCompleted, maxDigs, addBalance, updateTombChoice]);

  const handleComplete = useCallback(() => {
    setLevelPhase('summary');
  }, []);

  const handleBuyAnother = useCallback(async () => {
    if (!session) return;
    try {
      const price = ECONOMY.LEVELS[session.level].price;
      if (!USE_BLOCKCHAIN) {
        deductBalance(price);
      }

      // Update economy pools
      const splits = calculateSplits(session.level);
      setJackpotBalance(jackpotBalance + splits.jackpot);
      addBuyPressure(splits.tokenBuy);

      // Mint new digs (blockchain: SOL transfer + SPL mint + refreshBalances)
      const newBalance = await digService.mintDigs(session.level, ECONOMY.DIGS_PER_PACK);
      if (!USE_BLOCKCHAIN) {
        setDigBalance(newBalance);
      }

      // Start a fresh round
      const newSession = await digService.startRound(session.level);
      setActiveSession(newSession);
      setMaxDigs(Math.min(newBalance, 3));
      setLevelPhase('playing');
      setTombsCompleted(0);
      setCurrentReveal(null);
      setPendingReveal(null);
      setPrecomputedReveals(null);
      setChoiceResults({});
    } catch (err) {
      console.error('Failed to buy another:', err);
    }
  }, [session, deductBalance, setJackpotBalance, jackpotBalance, setDigBalance, setActiveSession]);

  const handleBackToGraveyard = useCallback(async () => {
    // Auto-claim SOL if user quits during a pending choice
    if (currentReveal && levelPhase === 'choosing') {
      try {
        await digService.claimReward(currentReveal.id, 'sol');
        if (!USE_BLOCKCHAIN) {
          addBalance(currentReveal.solPayout);
        }
      } catch {
        // best-effort — don't block navigation
      }
    }
    setActiveSession(null);
    setGamePhase('graveyard');
    router.push('/');
  }, [setActiveSession, setGamePhase, router, currentReveal, levelPhase, addBalance]);

  if (!session || !token) return null;

  return (
    <>
      <SolToast />
      <LevelCanvas
        key={session.id}
        session={session}
        token={token}
        maxDigs={maxDigs}
        onTombTapped={handleTombTapped}
        onTierRevealed={handleTierRevealed}
        onChoiceReady={handleChoiceReady}
        onAutoAdvance={handleAutoAdvance}
        onComplete={handleComplete}
        revealResult={pendingReveal}
        choiceResults={choiceResults}
      />

      {/* HUD overlay — above canvas (z-50), below modals (z-60) */}
      <div
        className={`fixed inset-0 z-[55] pointer-events-none transition-opacity duration-300 ${
          levelPhase !== 'playing' ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Top bar: logo left, wallet+inventory right */}
        <div className="flex items-start justify-between px-6 pt-6">
          {/* Logo — back to graveyard */}
          <button
            onClick={handleBackToGraveyard}
            className="pointer-events-auto cursor-pointer"
          >
            <Image
              src="/logo/dig-logo.png"
              alt="DIG"
              width={120}
              height={40}
              className="h-auto"
              priority
            />
          </button>

          {/* Wallet + Inventory stack */}
          <div className="flex flex-col items-end gap-2">
            {/* Sound toggle + Wallet pill */}
            {walletAddress && (
              <div className="flex items-center gap-2 pointer-events-auto">
                <SoundToggle />
                <div className="rounded-[14px] border border-muted/20 bg-black/50 backdrop-blur-sm px-4 py-2">
                  <span className="text-[12px] text-muted/60">
                    {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
                  </span>
                  <span className="ml-2 font-mono text-[13px] text-eerie">
                    {balance.toFixed(2)} SOL
                  </span>
                </div>
              </div>
            )}

            {/* Inventory pill */}
            <div className="rounded-[14px] bg-black/50 backdrop-blur-sm border border-[#FF9B3D]/20 px-4 py-2 flex items-center gap-2 shadow-[0_0_12px_rgba(255,155,61,0.08)]">
              <img
                src="/graveyard/pickaxe.png"
                alt="Pickaxe"
                className="h-[18px] w-auto object-contain drop-shadow-[0_0_4px_rgba(255,155,61,0.4)]"
                draggable={false}
              />
              <span className={`font-[var(--font-pirata)] text-[14px] drop-shadow-[0_0_6px_rgba(255,155,61,0.3)] ${visualDigs > 0 ? 'text-[#FF9B3D]' : 'text-muted/40'}`}>
                &times; {visualDigs}
              </span>
            </div>
          </div>
        </div>

        {/* Centered hint text */}
        <div className="flex justify-center mt-4">
          <div className="rounded-full bg-black/40 backdrop-blur-sm px-5 py-1.5 border border-white/5">
            <p className={`text-sm text-white/40 font-[var(--font-cinzel)] transition-opacity duration-700 ${
              tombsCompleted > 0 && tombsCompleted < 3 ? 'animate-[pulse_3s_ease-in-out_infinite]' : ''
            }`}>
              {tombsCompleted > 0 && tombsCompleted < maxDigs
                ? 'Tap the next tomb'
                : 'Tap a tomb to dig and discover the treasure within'}
            </p>
          </div>
        </div>

        {/* Bottom rewards bar */}
        <div className="fixed bottom-0 inset-x-0 pb-4 pointer-events-none">
          <div className="mx-auto w-fit rounded-xl bg-black/50 backdrop-blur-sm border border-white/5 px-6 py-2.5 flex justify-center gap-6">
            {TIER_INFO.map((tier) => (
              <div key={tier.name} className="flex flex-col items-center">
                <span
                  className="text-xs font-bold uppercase font-[var(--font-cinzel)] opacity-50"
                  style={{ color: tier.color }}
                >
                  {tier.name}
                </span>
                <span className="text-[10px] text-white/50">{tier.payout}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {levelPhase === 'choosing' && currentReveal && (
        <RewardChoice
          reveal={currentReveal}
          tokenSymbol={token.name}
          onChoice={handleChoice}
        />
      )}

      {levelPhase === 'summary' && (
        <LevelSummary
          session={session}
          maxDigs={maxDigs}
          onBuyAnother={handleBuyAnother}
          onBackToGraveyard={handleBackToGraveyard}
        />
      )}
    </>
  );
}
