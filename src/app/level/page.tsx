// src/app/level/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useGameStore } from '@/store/useGameStore';
import { gameService, isGameError, USE_BLOCKCHAIN } from '@/services';
import { refreshAccount, refreshJackpot } from '@/services/sync';
import { useWeeklyToken } from '@/hooks/useWeeklyToken';
import { useBackgroundY } from '@/hooks/useBackgroundY';
import { formatSol, payoutFor, priceOf } from '@/lib/game/economy';
import LevelCanvas from '@/components/level/LevelCanvas';
import LevelSummary, { TIER_COLORS, TIER_LABELS } from '@/components/level/LevelSummary';
import JackpotWinOverlay from '@/components/level/JackpotWinOverlay';
import { showSolToast, showToast } from '@/components/ui/SolToast';
import { useGainFlash } from '@/components/ui/CreditPill';
import SoundToggle from '@/components/ui/SoundToggle';
import { SoundEngine } from '@/lib/sound';
import { AnimatePresence, motion } from 'framer-motion';
import type { DigResult, JackpotWin, TierName } from '@/services/types';

const MockDebugPanel = USE_BLOCKCHAIN
  ? null
  : dynamic(() => import('@/components/debug/MockDebugPanel'), { ssr: false });

const PAYOUT_TIERS: TierName[] = ['dust', 'bone', 'coffin', 'zombie'];
const NEXT_ROUND_DELAY_MS = 1200;
// Top of the cemetery fence on the level background (0–1 of image height); the call to action sits just above it
const FENCE_TOP_Y = 0.41;

/** Credit shown in the HUD before the win "lands" (the ledger already includes it). */
function creditBeforeWin(dig: DigResult): number {
  const jackpotSol = dig.jackpot?.shares.find((h) => h.asset === 'SOL')?.amount ?? 0;
  return dig.credit - dig.payout - jackpotSol;
}

export default function LevelPage() {
  const router = useRouter();
  const level = useGameStore((s) => s.level);
  const roundNumber = useGameStore((s) => s.roundNumber);
  const account = useGameStore((s) => s.account);
  const jackpot = useGameStore((s) => s.jackpot);
  const modal = useGameStore((s) => s.modal);
  const stats = useGameStore((s) => s.sessionStats);
  const setCredit = useGameStore((s) => s.setCredit);
  const updateTomb = useGameStore((s) => s.updateTomb);
  const recordDig = useGameStore((s) => s.recordDig);
  const nextRound = useGameStore((s) => s.nextRound);
  const endLevel = useGameStore((s) => s.endLevel);
  const openModal = useGameStore((s) => s.openModal);
  const token = useWeeklyToken();
  const fenceY = useBackgroundY(FENCE_TOP_Y);

  const [busy, setBusy] = useState(false);                 // a tomb is digging / animating
  const [revealResult, setRevealResult] = useState<DigResult | null>(null);
  const [digFailed, setDigFailed] = useState(0);
  const [hudCredit, setHudCredit] = useState<number | null>(null); // overrides credit until the win lands
  const [jackpotWin, setJackpotWin] = useState<JackpotWin | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [resumeKey, setResumeKey] = useState(0);

  const credit = account?.credit ?? 0;
  const shownCredit = hudCredit ?? credit;
  const creditRef = useGainFlash(shownCredit);
  const price = level ? priceOf(level) : 0;
  const outOfCredit = !busy && credit < price;
  const lowCredit = !outOfCredit && credit < price * 3;
  const interactive = !busy && !outOfCredit && !jackpotWin && !showSummary && modal === null;
  // One tap digs the whole round; the chain pauses when credit runs out or an overlay opens
  const autoDig = credit >= price && !jackpotWin && !showSummary && modal === null;

  // Redirect to home if no level session
  useEffect(() => {
    if (!level) router.replace('/');
  }, [level, router]);

  // Ambient music — play on mount, stop on unmount
  useEffect(() => {
    SoundEngine.play('graveyardLoop');
    return () => { SoundEngine.stop('graveyardLoop'); };
  }, []);

  const handleTombTapped = useCallback(async (index: number) => {
    if (!level) return;
    setBusy(true);
    try {
      const dig = await gameService.dig(level, crypto.randomUUID());
      // Charged now; the win lands in the HUD when the tier is revealed
      setHudCredit(creditBeforeWin(dig));
      setCredit(dig.credit);
      updateTomb(index, dig);
      recordDig(dig);
      setRevealResult(dig);
    } catch (err) {
      setDigFailed((n) => n + 1);
      setBusy(false);
      if (isGameError(err, 'INSUFFICIENT_CREDIT')) {
        await refreshAccount();
      } else {
        showToast('error', isGameError(err) ? err.message : 'The dig failed. Try again.');
      }
    }
  }, [level, setCredit, updateTomb, recordDig]);

  const handleTierRevealed = useCallback((_index: number, dig: DigResult) => {
    setHudCredit(null);
    if (dig.payout > 0) showSolToast(dig.payout);
    if (dig.jackpot) {
      setJackpotWin(dig.jackpot);
      void refreshJackpot();
    }
  }, []);

  const handleTombDone = useCallback(() => {
    setRevealResult(null);
    const round = useGameStore.getState().round;
    const allOpened = round?.tombs.every((t) => t.status === 'opened');
    if (allOpened) {
      // Let the player see the last result, then fresh tombs rise
      setTimeout(() => {
        nextRound();
        setBusy(false);
      }, NEXT_ROUND_DELAY_MS);
    } else {
      setBusy(false);
    }
  }, [nextRound]);

  const goHome = useCallback(() => {
    endLevel();
    router.push('/');
  }, [endLevel, router]);

  const handleLeave = useCallback(() => {
    if (useGameStore.getState().sessionStats.digs > 0) setShowSummary(true);
    else goHome();
  }, [goHome]);

  if (!level) return null;

  const tierInfo = [
    ...PAYOUT_TIERS.map((tier) => {
      const payout = payoutFor(tier, level);
      return { tier, payout: payout > 0 ? `+${formatSol(payout)} SOL` : '0 SOL' };
    }),
    { tier: 'resurrect' as const, payout: jackpot ? `Jackpot ≈ ${jackpot.valueSol.toFixed(2)}` : 'Jackpot' },
  ];

  return (
    <>
      <LevelCanvas
        roundKey={roundNumber}
        token={token}
        interactive={interactive}
        dimmed={outOfCredit}
        autoDig={autoDig}
        resumeKey={resumeKey}
        onTombTapped={handleTombTapped}
        onTierRevealed={handleTierRevealed}
        onTombDone={handleTombDone}
        revealResult={revealResult}
        digFailed={digFailed}
      />

      {/* HUD overlay — above canvas (z-50), below overlays (z-60) and modals (z-70) */}
      <div
        className={`fixed inset-0 z-[55] pointer-events-none transition-opacity duration-300 ${
          showSummary || jackpotWin ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Top bar: logo left, credit right */}
        <div className="flex items-start justify-between px-6 pt-6">
          {/* Logo — back to graveyard */}
          <button onClick={handleLeave} className="pointer-events-auto cursor-pointer" aria-label="Leave the crypt">
            <Image src="/logo/dig-logo.png" alt="DIG" width={120} height={40} className="h-auto" priority />
          </button>

          <div className="flex items-center gap-2 pointer-events-auto">
            <SoundToggle />
            <div
              className={`flex items-center gap-2 rounded-[14px] border bg-black/50 py-1.5 pl-4 pr-1.5 backdrop-blur-sm ${
                lowCredit || outOfCredit
                  ? 'border-[#FF9B3D]/40 shadow-[0_0_14px_rgba(255,155,61,0.15)]'
                  : 'border-muted/20'
              }`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted/50">Credit</span>
              <span ref={creditRef} className="font-mono text-[14px] font-bold text-ink">{formatSol(shownCredit)} SOL</span>
              <span className="font-mono text-[11px] text-muted/40">· {formatSol(price)} / dig</span>
              <button
                onClick={() => openModal('deposit')}
                className="ml-1 rounded-[10px] bg-[#f0c850]/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#f0c850] transition hover:bg-[#f0c850]/25"
              >
                Top up
              </button>
            </div>
          </div>
        </div>

        {/* Call to action — engraved caps, breathing torch glow, just above the fence; hidden while digging */}
        <div
          className="absolute inset-x-0 flex justify-center -translate-y-full"
          style={{ top: fenceY ?? '38%' }}
        >
          <AnimatePresence>
            {!outOfCredit && !busy && (
              <motion.div
                key={lowCredit ? 'low' : 'strike'}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="relative px-10 py-2 text-center"
              >
                {/* soft dark halo for legibility over the moonlit sky */}
                <div className="absolute inset-0 -z-10 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.7),rgba(0,0,0,0.35)_45%,transparent_72%)]" />
                <div className="flex items-center justify-center gap-3">
                  <span className="h-px w-10 bg-gradient-to-r from-transparent to-[#FF9B3D]/60" />
                  <p className="cta-breathe font-cinzel text-[15px] font-bold uppercase tracking-[0.32em] text-[#FFB25E]">
                    {lowCredit ? 'Running Low' : 'Strike a Tomb'}
                  </p>
                  <span className="h-px w-10 bg-gradient-to-l from-transparent to-[#FF9B3D]/60" />
                </div>
                <p className="mt-1 font-cinzel text-[11px] font-semibold tracking-[0.16em] text-white/50">
                  {lowCredit ? 'Top up to keep digging' : `One strike digs all three · ${formatSol(price)} SOL each`}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom rewards bar */}
        <div className="fixed bottom-0 inset-x-0 pb-4 pointer-events-none">
          <div className="mx-auto w-fit rounded-xl bg-black/50 backdrop-blur-sm border border-white/5 px-6 py-2.5 flex justify-center gap-6">
            {tierInfo.map(({ tier, payout }) => (
              <div key={tier} className="flex flex-col items-center">
                <span
                  className="text-xs font-bold uppercase font-cinzel tracking-[0.08em] opacity-60"
                  style={{ color: TIER_COLORS[tier] }}
                >
                  {TIER_LABELS[tier]}
                </span>
                <span className="text-[10px] text-white/50">{payout}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Out of credit */}
      {outOfCredit && !showSummary && !jackpotWin && (
        <div className="fixed inset-0 z-[58] flex items-center justify-center pointer-events-none px-4">
          <div className="pointer-events-auto w-full max-w-[380px] rounded-xl2 border border-muted/20 bg-gradient-to-b from-[#1A1A3E]/95 to-[#0A0A1A]/95 p-7 text-center shadow-panel">
            <h2 className="font-gothic text-[26px] tracking-[0.08em] text-ink">Your Purse Is Empty</h2>
            <p className="mt-2 text-[13px] text-muted/60">
              Credit: {formatSol(credit)} SOL · a dig costs {formatSol(price)} SOL
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={() => openModal('deposit')}
                className="spin-btn spin-btn-mint relative w-full rounded-[14px] bg-[#1a1725] px-4 py-3 text-[14px] font-bold uppercase tracking-[0.12em] text-[#f0c850] transition-all duration-300"
              >
                <span className="relative z-10">Top Up</span>
              </button>
              <button
                onClick={handleLeave}
                className="w-full rounded-[14px] border border-muted/15 px-4 py-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted/60 transition hover:text-ink hover:border-muted/30"
              >
                Leave the Crypt
              </button>
            </div>
          </div>
        </div>
      )}

      {jackpotWin && (
        <JackpotWinOverlay
          win={jackpotWin}
          onClose={() => { setJackpotWin(null); setResumeKey((k) => k + 1); }}
        />
      )}

      {showSummary && (
        <LevelSummary
          stats={stats}
          credit={credit}
          onTopUp={() => { setShowSummary(false); openModal('deposit'); }}
          onBackToGraveyard={goHome}
        />
      )}

      {MockDebugPanel && (
        <div className="fixed bottom-4 left-4 z-[65]">
          <MockDebugPanel collapsible />
        </div>
      )}
    </>
  );
}
