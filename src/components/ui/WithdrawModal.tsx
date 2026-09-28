// src/components/ui/WithdrawModal.tsx
'use client';

import { useState } from 'react';
import ModalShell from './ModalShell';
import { showToast } from './SolToast';
import { useGameStore } from '@/store/useGameStore';
import { gameService, isGameError } from '@/services';
import { refreshAccount } from '@/services/sync';
import { ECONOMY } from '@/config/economy';
import { formatSol, lamportsToSol, solToLamports } from '@/lib/game/economy';

type Phase = 'form' | 'pending' | 'sent' | 'review';

export default function WithdrawModal() {
  const closeModal = useGameStore((s) => s.closeModal);
  const credit = useGameStore((s) => s.account?.credit ?? 0);
  const [amount, setAmount] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState<string | null>(null);
  const [sentLamports, setSentLamports] = useState(0);

  const sol = Number(amount);
  const lamports = Number.isFinite(sol) ? solToLamports(sol) : 0;

  const validation =
    !Number.isFinite(sol) || sol <= 0 ? 'Enter an amount.'
      : lamports < ECONOMY.WITHDRAW.MIN_LAMPORTS ? `Minimum withdrawal is ${formatSol(ECONOMY.WITHDRAW.MIN_LAMPORTS)} SOL.`
        : lamports > credit ? 'More than your credit.'
          : null;

  const submit = async () => {
    setError(null);
    setPhase('pending');
    try {
      const { withdrawal } = await gameService.withdraw(lamports, crypto.randomUUID());
      await refreshAccount();
      setSentLamports(withdrawal.lamports);
      if (withdrawal.status === 'review') {
        setPhase('review');
      } else {
        setPhase('sent');
        showToast('credit', `${formatSol(withdrawal.lamports)} SOL`, 'sent to wallet');
      }
    } catch (err) {
      setError(isGameError(err) ? err.message : 'Withdrawal failed. Please try again.');
      setPhase('form');
    }
  };

  return (
    <ModalShell title="Leave With Your Loot" onClose={closeModal} closable={phase !== 'pending'}>
      {phase === 'pending' ? (
        <p className="mt-8 mb-4 text-center text-[14px] text-muted/70 animate-pulse">Sending SOL to your wallet…</p>
      ) : phase === 'sent' ? (
        <div className="mt-6 text-center">
          <p className="text-[15px] font-semibold text-[#f0c850]">{formatSol(sentLamports)} SOL sent ✓</p>
          <button onClick={closeModal} className="mt-5 text-[13px] text-muted/60 underline-offset-4 hover:text-ink hover:underline">Close</button>
        </div>
      ) : phase === 'review' ? (
        <div className="mt-6 text-center">
          <p className="text-[15px] font-semibold text-ink">Under review</p>
          <p className="mt-2 text-[13px] text-muted/60">
            {formatSol(sentLamports)} SOL — a gravekeeper will check this shortly.
          </p>
          <button onClick={closeModal} className="mt-5 text-[13px] text-muted/60 underline-offset-4 hover:text-ink hover:underline">Close</button>
        </div>
      ) : (
        <>
          <p className="mt-4 text-center text-[13px] text-muted/60">
            Credit: <span className="font-mono text-ink">{formatSol(credit)} SOL</span>
          </p>

          <div className="mt-4 flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              min={lamportsToSol(ECONOMY.WITHDRAW.MIN_LAMPORTS)}
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-[12px] border border-muted/20 bg-black/40 px-3 py-2.5 font-mono text-[15px] text-ink outline-none focus:border-[#f0c850]/50"
            />
            <button
              onClick={() => setAmount(String(lamportsToSol(credit)))}
              className="rounded-[12px] border border-muted/20 px-4 text-[12px] font-bold uppercase tracking-[0.1em] text-muted/70 transition hover:text-ink"
            >
              Max
            </button>
          </div>

          {(error || (amount !== '' && validation)) && (
            <p className={`mt-3 text-center text-[12px] ${error ? 'text-[#FF6B6B]' : 'text-muted/50'}`}>
              {error ?? validation}
            </p>
          )}

          <button
            onClick={() => void submit()}
            disabled={validation !== null}
            className="mt-5 w-full rounded-[14px] border border-muted/25 bg-gradient-to-b from-[#252230] to-[#1a1824] px-4 py-3 text-[14px] font-bold uppercase tracking-[0.12em] text-ink transition hover:border-muted/45 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Withdraw
          </button>
          <p className="mt-3 text-center text-[11px] text-muted/40">No wallet popup: the treasury sends the SOL.</p>
        </>
      )}
    </ModalShell>
  );
}
