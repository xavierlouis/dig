// src/app/debug/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { getRevealLogs, clearRevealLogs, getTierDistribution, type RevealLog } from '@/lib/random';
import { rollTier, createRevealLog, logReveal } from '@/lib/random';
import { ECONOMY } from '@/config/economy';
import { calculateSolPayout } from '@/lib/economy';
import type { TierName } from '@/services/types';

const TIER_NAMES: TierName[] = ['dust', 'bone', 'coffin', 'zombie', 'resurrect'];

const TIER_COLORS: Record<TierName, string> = {
  dust: '#4A4860',
  bone: '#C8C0D0',
  coffin: '#CD7F32',
  zombie: '#00C853',
  resurrect: '#FFD700',
};

export default function DebugPage() {
  const [logs, setLogs] = useState<RevealLog[]>([]);
  const [distribution, setDistribution] = useState<Record<TierName, number>>({ dust: 0, bone: 0, coffin: 0, zombie: 0, resurrect: 0 });
  const [simulating, setSimulating] = useState(false);

  const refresh = () => {
    setLogs(getRevealLogs());
    setDistribution(getTierDistribution());
  };

  useEffect(() => { refresh(); }, []);

  const totalReveals = logs.length;
  const totalPayout = logs.reduce((s, l) => s + l.actualPayout, 0);

  const handleSimulate = () => {
    setSimulating(true);
    setTimeout(() => {
      for (let item = 0; item < 1000; item++) {
        const sessionId = `sim-${Date.now()}-${item}`;
        for (let tomb = 0; tomb < 3; tomb++) {
          const { tier, roll, seed } = rollTier();
          const payout = calculateSolPayout(tier, 'shallow_grave');
          const log = createRevealLog(sessionId, tomb, tier, roll, seed, payout, 0);
          logReveal(log);
        }
      }
      refresh();
      setSimulating(false);
    }, 50);
  };

  const handleClear = () => {
    clearRevealLogs();
    refresh();
  };

  const handleExport = () => {
    const headers = 'id,sessionId,tombIndex,timestamp,seed,roll,tier,payout,tokenValue,choice,actualPayout';
    const rows = logs.map((l) =>
      `${l.id},${l.sessionId},${l.tombIndex},${l.timestamp},${l.seed},${l.roll},${l.tier},${l.payout},${l.tokenValue},${l.choice ?? ''},${l.actualPayout}`
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dig-reveals-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-[#07060b] text-[#e8e6f0] p-8">
      <div className="mx-auto max-w-[900px]">
        <h1 className="font-gothic text-[28px] tracking-[0.08em]">Debug — Economy Dashboard</h1>
        <p className="mt-1 text-[13px] text-[#7a7790]">Hidden page. Reveal logs and economy stats.</p>

        {/* Stats row */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <StatCard label="Total Reveals" value={totalReveals.toString()} />
          <StatCard label="Total Payout" value={`${totalPayout.toFixed(4)} SOL`} />
          <StatCard
            label="Avg Payout / Reveal"
            value={totalReveals > 0 ? `${(totalPayout / totalReveals).toFixed(4)} SOL` : '—'}
          />
        </div>

        {/* Tier Distribution */}
        <div className="mt-8">
          <h2 className="text-[16px] font-semibold">Tier Distribution</h2>
          <div className="mt-3 space-y-2">
            {TIER_NAMES.map((tier) => {
              const count = distribution[tier];
              const actual = totalReveals > 0 ? (count / totalReveals * 100) : 0;
              const expected = ECONOMY.TIERS[tier].odds * 100;
              return (
                <div key={tier} className="flex items-center gap-3">
                  <span className="w-[80px] text-[12px] font-bold uppercase" style={{ color: TIER_COLORS[tier] }}>
                    {tier}
                  </span>
                  <div className="flex-1 h-[20px] rounded-full bg-[#12122a] overflow-hidden relative">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${actual}%`, background: TIER_COLORS[tier] + '80' }}
                    />
                    {/* Expected marker */}
                    <div
                      className="absolute top-0 h-full w-[2px] bg-white/30"
                      style={{ left: `${expected}%` }}
                    />
                  </div>
                  <span className="w-[60px] text-right text-[12px] font-mono">
                    {actual.toFixed(1)}%
                  </span>
                  <span className="w-[60px] text-right text-[11px] font-mono text-[#7a7790]">
                    ({expected}%)
                  </span>
                  <span className="w-[40px] text-right text-[11px] font-mono text-[#7a7790]">
                    x{count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSimulate}
            disabled={simulating}
            className="rounded-[10px] border border-[#6C63FF]/30 bg-[#6C63FF]/10 px-4 py-2 text-[13px] font-semibold text-[#8B83FF] hover:bg-[#6C63FF]/20 disabled:opacity-50"
          >
            {simulating ? 'Simulating...' : 'Simulate 1000 Items (3000 Tombs)'}
          </button>
          <button
            onClick={handleExport}
            disabled={logs.length === 0}
            className="rounded-[10px] border border-muted/20 px-4 py-2 text-[13px] font-semibold text-[#b9b1c9] hover:bg-white/5 disabled:opacity-30"
          >
            Export CSV
          </button>
          <button
            onClick={handleClear}
            className="rounded-[10px] border border-[#FF3D3D]/20 px-4 py-2 text-[13px] font-semibold text-[#FF3D3D]/60 hover:bg-[#FF3D3D]/10"
          >
            Clear All
          </button>
        </div>

        {/* Recent Reveals Table */}
        <div className="mt-8">
          <h2 className="text-[16px] font-semibold">Last 100 Reveals</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[#1a1a3e] text-left text-[#7a7790]">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Tier</th>
                  <th className="py-2 pr-3">Roll</th>
                  <th className="py-2 pr-3">Payout</th>
                  <th className="py-2 pr-3">Choice</th>
                  <th className="py-2 pr-3">Session</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(-100).reverse().map((log, i) => (
                  <tr key={log.id} className="border-b border-[#12122a]/50">
                    <td className="py-1.5 pr-3 font-mono text-[#4a4860]">{logs.length - i}</td>
                    <td className="py-1.5 pr-3 font-bold uppercase" style={{ color: TIER_COLORS[log.tier] }}>
                      {log.tier}
                    </td>
                    <td className="py-1.5 pr-3 font-mono">{log.roll.toFixed(4)}</td>
                    <td className="py-1.5 pr-3 font-mono">{log.actualPayout.toFixed(4)}</td>
                    <td className="py-1.5 pr-3">{log.choice ?? '—'}</td>
                    <td className="py-1.5 pr-3 font-mono text-[#4a4860] truncate max-w-[120px]">{log.sessionId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && (
              <p className="py-6 text-center text-[13px] text-[#4a4860]">No reveals yet. Play a game or run a simulation.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-[#1a1a3e] bg-[#0a0a1a] p-4">
      <div className="text-[11px] font-medium text-[#7a7790] uppercase tracking-wider">{label}</div>
      <div className="mt-1 text-[20px] font-mono font-bold">{value}</div>
    </div>
  );
}
