// src/components/debug/MockDebugPanel.tsx
// Mock-mode only controls: force tiers, move credit, drive the simulated jackpot, simulate failures.
// Loaded only when NEXT_PUBLIC_USE_BLOCKCHAIN=false; the server has no equivalent inputs.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { mockDebug, type MockSnapshot } from '@/services/mock/mockGameService';
import { refreshAccount, refreshJackpot } from '@/services/sync';
import { useGameStore } from '@/store/useGameStore';
import { TIER_ORDER, formatSol } from '@/lib/game/economy';
import { LAMPORTS_PER_SOL } from '@/config/economy';
import { formatHoldingValue, formatTokenAmount } from '@/components/JackpotDisplay';
import { TIER_COLORS, TIER_LABELS } from '@/components/level/LevelSummary';

interface MockDebugPanelProps {
  collapsible?: boolean; // small "DEV" toggle for the level overlay
}

export default function MockDebugPanel({ collapsible = false }: MockDebugPanelProps) {
  const [snap, setSnap] = useState<MockSnapshot | null>(null);
  const [open, setOpen] = useState(!collapsible);
  const signedIn = useGameStore((s) => s.account !== null);

  const reload = useCallback(() => {
    void mockDebug.snapshot().then(setSnap);
  }, []);

  useEffect(() => {
    reload();
    return mockDebug.subscribe(reload);
  }, [reload]);

  const act = async (fn: () => Promise<unknown> | void) => {
    await fn();
    await Promise.all([signedIn ? refreshAccount() : Promise.resolve(), refreshJackpot()]);
    reload();
  };

  if (collapsible && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-[10px] border border-[#8B83FF]/30 bg-black/70 px-3 py-1.5 font-mono text-[11px] font-bold text-[#8B83FF] backdrop-blur-sm hover:bg-black/90"
      >
        DEV
      </button>
    );
  }

  if (!snap) return null;

  const btn = 'rounded-[8px] border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70 transition hover:border-white/30 hover:text-white disabled:opacity-40';
  const tokens = snap.holdings.filter((h) => h.asset !== 'SOL');

  return (
    <div className="w-[320px] rounded-[14px] border border-[#8B83FF]/25 bg-[#0a0a1a]/95 p-4 text-[12px] text-white/80 shadow-panel backdrop-blur-md">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#8B83FF]">Mock controls</span>
        {collapsible && (
          <button onClick={() => setOpen(false)} aria-label="Close" className="text-white/40 hover:text-white">×</button>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-y-0.5 font-mono text-[11px]">
        <dt className="text-white/40">Credit</dt><dd className="text-right">{formatSol(snap.credit)} SOL</dd>
        <dt className="text-white/40">Wallet</dt><dd className="text-right">{formatSol(snap.walletLamports)} SOL</dd>
        <dt className="text-white/40">Nonce</dt><dd className="text-right">{snap.nonce}</dd>
        <dt className="text-white/40">Week</dt><dd className="text-right">{snap.weekId} · {snap.tokenName}</dd>
      </dl>

      <p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-white/40">Force next dig</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {TIER_ORDER.map((tier) => (
          <button
            key={tier}
            onClick={() => act(() => mockDebug.setForceNextTier(snap.flags.forceNextTier === tier ? null : tier))}
            className={btn}
            style={snap.flags.forceNextTier === tier ? { borderColor: TIER_COLORS[tier], color: TIER_COLORS[tier] } : undefined}
          >
            {TIER_LABELS[tier]}
          </button>
        ))}
      </div>

      <p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-white/40">Credit</p>
      <div className="mt-1 flex flex-wrap gap-1">
        <button className={btn} disabled={!signedIn} onClick={() => act(() => mockDebug.addCredit(LAMPORTS_PER_SOL))}>+1 SOL</button>
        <button className={btn} disabled={!signedIn} onClick={() => act(() => mockDebug.addCredit(-snap.credit))}>Empty</button>
      </div>

      <p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-white/40">Jackpot crypt bag</p>
      <ul className="mt-1 space-y-0.5 font-mono text-[11px]">
        {snap.holdings.map((h) => (
          <li key={h.asset} className="flex justify-between gap-2">
            <span>{h.symbol}</span>
            <span className="text-white/50">{formatTokenAmount(h)}</span>
            <span className="text-[#FFD700]/70">{formatHoldingValue(h)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap gap-1">
        <button className={btn} onClick={() => act(() => mockDebug.runDcaNow())}>Run DCA slice</button>
        <button className={btn} onClick={() => act(() => mockDebug.skipWeek())}>Next week</button>
        {tokens.map((h) => (
          <button key={h.asset} className={btn} disabled={h.valueSol === null} onClick={() => act(() => mockDebug.crashToken(h.asset))}>
            Crash {h.symbol}
          </button>
        ))}
      </div>

      <p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-white/40">Failures</p>
      <div className="mt-1 flex flex-wrap gap-1">
        <button
          className={btn}
          style={snap.flags.slowNetwork ? { borderColor: '#FF9B3D', color: '#FF9B3D' } : undefined}
          onClick={() => act(() => mockDebug.setSlowNetwork(!snap.flags.slowNetwork))}
        >
          Slow network {snap.flags.slowNetwork ? 'on' : 'off'}
        </button>
        <button
          className={btn}
          style={snap.flags.failNextDeposit ? { borderColor: '#FF3D3D', color: '#FF6B6B' } : undefined}
          onClick={() => act(() => mockDebug.failNextDeposit())}
        >
          Fail next deposit
        </button>
      </div>

      <button
        className="mt-4 w-full rounded-[8px] border border-[#FF3D3D]/25 py-1.5 text-[11px] font-semibold text-[#FF6B6B]/80 hover:bg-[#FF3D3D]/10"
        onClick={() => {
          if (window.confirm('Reset mock wallet, credit, seeds, jackpot and history?')) void act(() => mockDebug.reset());
        }}
      >
        Reset everything
      </button>
    </div>
  );
}
