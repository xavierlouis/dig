// src/app/debug/page.tsx
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ECONOMY } from '@/config/economy';
import {
  TIER_ORDER, expectedInstantPayoutRate, formatSol, jackpotContribution, payoutFor, priceOf, tierOddsPpm,
} from '@/lib/game/economy';
import { resolveDig } from '@/lib/game/resolve';
import { USE_BLOCKCHAIN } from '@/services';
import type { LevelId, TierName } from '@/services/types';
import type { MockDigRecord } from '@/services/mock/mockGameService';

const MockDebugPanel = USE_BLOCKCHAIN
  ? null
  : dynamic(() => import('@/components/debug/MockDebugPanel'), { ssr: false });

const TIER_COLORS: Record<TierName, string> = {
  dust: '#4A4860',
  bone: '#C8C0D0',
  coffin: '#CD7F32',
  zombie: '#00C853',
  resurrect: '#FFD700',
};

const LEVELS = Object.keys(ECONOMY.LEVELS) as LevelId[];

interface SimResult {
  level: LevelId;
  digs: number;
  counts: Record<TierName, number>;
  wagered: number;
  paid: number;
  jackpotFunded: number;
}

function simulate(level: LevelId, digs: number): SimResult {
  const counts: Record<TierName, number> = { dust: 0, bone: 0, coffin: 0, zombie: 0, resurrect: 0 };
  let paid = 0;
  for (let i = 0; i < digs; i++) {
    const { tier, payout } = resolveDig(Math.random(), level);
    counts[tier]++;
    paid += payout;
  }
  return { level, digs, counts, wagered: digs * priceOf(level), paid, jackpotFunded: digs * jackpotContribution(level) };
}

export default function DebugPage() {
  const [level, setLevel] = useState<LevelId>('shallow_grave');
  const [sim, setSim] = useState<SimResult | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [digs, setDigs] = useState<MockDigRecord[]>([]);

  // Mock dig history (mock mode only)
  useEffect(() => {
    if (USE_BLOCKCHAIN) return;
    let unsubscribe = () => {};
    void import('@/services/mock/mockGameService').then(({ mockDebug }) => {
      const load = () => { void mockDebug.snapshot().then((s) => setDigs(s.digs)); };
      load();
      unsubscribe = mockDebug.subscribe(load);
    });
    return () => unsubscribe();
  }, []);

  const runSim = (n: number) => {
    setSimulating(true);
    setTimeout(() => {
      setSim(simulate(level, n));
      setSimulating(false);
    }, 30);
  };

  const handleExport = () => {
    const headers = 'id,createdAt,level,tier,wager,payout,nonce,roll,clientSeed,serverSeedHash,forced,creditAfter,jackpotSol';
    const rows = digs.map((d) =>
      [d.id, new Date(d.createdAt).toISOString(), d.level, d.tier, d.wager, d.payout, d.nonce, d.roll,
        d.clientSeed, d.serverSeedHash, d.forced ? 1 : 0, d.credit, d.jackpot?.valueSol ?? ''].join(','),
    );
    const blob = new Blob([[headers, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dig-mock-digs-${new Date().toISOString().slice(0, 19)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const odds = tierOddsPpm(level);

  return (
    <main className="min-h-screen bg-[#07060b] text-[#e8e6f0] p-8">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 lg:flex-row">
        <div className="min-w-0 flex-1">
          <h1 className="font-gothic text-[28px] tracking-[0.08em]">Debug — Economy Dashboard</h1>
          <p className="mt-1 text-[13px] text-[#7a7790]">
            Hidden page. {USE_BLOCKCHAIN ? 'Live ledger stats arrive with the server (phase 2).' : 'Mock mode: controls on the right.'}
          </p>

          {/* Economy table */}
          <div className="mt-6 flex gap-2">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => { setLevel(l); setSim(null); }}
                className={`rounded-[10px] border px-3 py-1.5 text-[12px] font-semibold ${
                  l === level ? 'border-[#8B83FF]/60 text-[#8B83FF]' : 'border-[#1a1a3e] text-[#7a7790] hover:text-[#e8e6f0]'
                }`}
              >
                {l} · {formatSol(priceOf(l))} SOL{ECONOMY.LEVELS[l].locked ? ' (locked)' : ''}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <StatCard label="Instant payout rate" value={`${(expectedInstantPayoutRate() * 100).toFixed(1)}%`} />
            <StatCard label="Jackpot share" value={`${ECONOMY.JACKPOT.SPLIT_BPS / 100}%`} />
            <StatCard label="House" value={`${ECONOMY.HOUSE_SPLIT_BPS / 100}%`} />
          </div>

          {/* Tier Distribution */}
          <div className="mt-8">
            <h2 className="text-[16px] font-semibold">
              Tier distribution {sim ? `— ${sim.digs.toLocaleString()} simulated digs` : '— expected'}
            </h2>
            <div className="mt-3 space-y-2">
              {TIER_ORDER.map((tier) => {
                const expected = (odds[tier] / 1_000_000) * 100;
                const actual = sim ? (sim.counts[tier] / sim.digs) * 100 : expected;
                const payout = payoutFor(tier, level);
                return (
                  <div key={tier} className="flex items-center gap-3">
                    <span className="w-[80px] text-[12px] font-bold uppercase" style={{ color: TIER_COLORS[tier] }}>
                      {tier}
                    </span>
                    <div className="relative h-[20px] flex-1 overflow-hidden rounded-full bg-[#12122a]">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(actual, 0.3)}%`, background: TIER_COLORS[tier] + '80' }}
                      />
                      <div className="absolute top-0 h-full w-[2px] bg-white/30" style={{ left: `${expected}%` }} />
                    </div>
                    <span className="w-[70px] text-right font-mono text-[12px]">{actual.toFixed(tier === 'resurrect' ? 3 : 2)}%</span>
                    <span className="w-[70px] text-right font-mono text-[11px] text-[#7a7790]">({expected.toFixed(tier === 'resurrect' ? 3 : 2)}%)</span>
                    <span className="w-[90px] text-right font-mono text-[11px] text-[#7a7790]">
                      {tier === 'resurrect' ? 'crypt bag' : `${formatSol(payout)} SOL`}
                    </span>
                    {sim && <span className="w-[70px] text-right font-mono text-[11px] text-[#7a7790]">×{sim.counts[tier]}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {sim && (
            <div className="mt-6 grid grid-cols-3 gap-4">
              <StatCard label="Instant paid / wagered" value={`${((sim.paid / sim.wagered) * 100).toFixed(2)}%`} />
              <StatCard label="Jackpot funded" value={`${formatSol(sim.jackpotFunded)} SOL`} />
              <StatCard label="Resurrect hits" value={`${sim.counts.resurrect}`} />
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {[10_000, 100_000, 1_000_000].map((n) => (
              <button
                key={n}
                onClick={() => runSim(n)}
                disabled={simulating}
                className="rounded-[10px] border border-[#6C63FF]/30 bg-[#6C63FF]/10 px-4 py-2 text-[13px] font-semibold text-[#8B83FF] hover:bg-[#6C63FF]/20 disabled:opacity-50"
              >
                {simulating ? 'Simulating…' : `Simulate ${n.toLocaleString()} digs`}
              </button>
            ))}
          </div>

          {/* Mock dig history */}
          {!USE_BLOCKCHAIN && (
            <div className="mt-10">
              <div className="flex items-center justify-between">
                <h2 className="text-[16px] font-semibold">Last 100 mock digs</h2>
                <button
                  onClick={handleExport}
                  disabled={digs.length === 0}
                  className="rounded-[10px] border border-white/10 px-3 py-1.5 text-[12px] font-semibold text-[#b9b1c9] hover:bg-white/5 disabled:opacity-30"
                >
                  Export CSV ({digs.length})
                </button>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-[#1a1a3e] text-left text-[#7a7790]">
                      <th className="py-2 pr-3">Nonce</th>
                      <th className="py-2 pr-3">Tier</th>
                      <th className="py-2 pr-3">Roll</th>
                      <th className="py-2 pr-3">Wager</th>
                      <th className="py-2 pr-3">Payout</th>
                      <th className="py-2 pr-3">Credit after</th>
                    </tr>
                  </thead>
                  <tbody>
                    {digs.slice(-100).reverse().map((d) => (
                      <tr key={d.id} className="border-b border-[#12122a]/50">
                        <td className="py-1.5 pr-3 font-mono text-[#4a4860]">{d.nonce}</td>
                        <td className="py-1.5 pr-3 font-bold uppercase" style={{ color: TIER_COLORS[d.tier] }}>
                          {d.tier}{d.forced ? ' (forced)' : ''}
                        </td>
                        <td className="py-1.5 pr-3 font-mono">{d.roll.toFixed(6)}</td>
                        <td className="py-1.5 pr-3 font-mono">{formatSol(d.wager)}</td>
                        <td className="py-1.5 pr-3 font-mono">
                          {d.jackpot ? `≈ ${d.jackpot.valueSol.toFixed(2)} (jackpot)` : formatSol(d.payout)}
                        </td>
                        <td className="py-1.5 pr-3 font-mono">{formatSol(d.credit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {digs.length === 0 && (
                  <p className="py-6 text-center text-[13px] text-[#4a4860]">No digs yet. Play a round or run a simulation.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {MockDebugPanel && (
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <MockDebugPanel />
          </aside>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-[#1a1a3e] bg-[#0a0a1a] p-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-[#7a7790]">{label}</div>
      <div className="mt-1 font-mono text-[20px] font-bold">{value}</div>
    </div>
  );
}
