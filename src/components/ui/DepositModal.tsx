// src/components/ui/DepositModal.tsx
'use client';

import { useState } from 'react';
import ModalShell from './ModalShell';
import { showToast } from './SolToast';
import { useGameStore } from '@/store/useGameStore';
import { gameService, isGameError, USE_BLOCKCHAIN } from '@/services';
import { refreshAccount } from '@/services/sync';
import { ECONOMY } from '@/config/economy';
import { formatSol, lamportsToSol, priceOf, solToLamports } from '@/lib/game/economy';

type Phase = 'form' | 'approve' | 'pending' | 'done';

export default function DepositModal() {
  const closeModal = useGameStore((s) => s.closeModal);
  const walletSol = useGameStore((s) => s.balance);
  const [amount, setAmount] = useState(String(ECONOMY.DEPOSIT.PRESETS_SOL[1]));
  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState<string | null>(null);

  const sol = Number(amount);
  const lamports = Number.isFinite(sol) ? solToLamports(sol) : 0;
  const digs = Math.floor(lamports / priceOf('shallow_grave'));

  const validation =
    !Number.isFinite(sol) || sol <= 0 ? 'Enter an amount.'
      : lamports < ECONOMY.DEPOSIT.MIN_LAMPORTS ? `Minimum deposit is ${formatSol(ECONOMY.DEPOSIT.MIN_LAMPORTS)} SOL.`
        : sol > walletSol ? 'Not enough SOL in your wallet.'
          : null;

  const submit = () => {
    setError(null);
    // Mock mode stands in for the wallet popup with its own approve step
    if (!USE_BLOCKCHAIN) setPhase('approve');
    else void send();
  };

  const send = async () => {
    setPhase('pending');
    try {
      await gameService.deposit(lamports);
      await refreshAccount();
      setPhase('done');
      showToast('credit', `+${formatSol(lamports)} SOL`, 'deposited');
      setTimeout(closeModal, 900);
    } catch (err) {
      setError(isGameError(err) ? err.message : 'Deposit failed. Please try again.');
      setPhase('form');
    }
  };

  return (
    <ModalShell title="Fill Your Purse" onClose={closeModal} closable={phase !== 'pending'}>
      {phase === 'approve' ? (
        <div className="mt-6 rounded-[14px] border border-[#8B83FF]/25 bg-black/40 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8B83FF]/80">Mock wallet</p>
          <p className="mt-2 text-[14px] text-ink/90">
            Approve a transfer of <span className="font-mono font-bold text-[#f0c850]">{formatSol(lamports)} SOL</span> to the DIG treasury?
          </p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => { setError('You rejected the transaction.'); setPhase('form'); }}
              className="flex-1 rounded-[12px] border border-muted/20 px-4 py-2.5 text-[13px] font-semibold text-muted/70 transition hover:text-ink"
            >
              Reject
            </button>
            <button
              onClick={() => void send()}
              className="flex-1 rounded-[12px] bg-[#6C63FF] px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-[#8B83FF]"
            >
              Approve
            </button>
          </div>
        </div>
      ) : phase === 'pending' ? (
        <p className="mt-8 mb-4 text-center text-[14px] text-muted/70 animate-pulse">
          Waiting for the graveyard to confirm…
        </p>
      ) : phase === 'done' ? (
        <p className="mt-8 mb-4 text-center text-[15px] font-semibold text-[#f0c850]">
          {formatSol(lamports)} SOL added to your credit
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-4 gap-2">
            {ECONOMY.DEPOSIT.PRESETS_SOL.map((preset) => (
              <button
                key={preset}
                onClick={() => setAmount(String(preset))}
                className={`rounded-[12px] border px-2 py-2.5 font-mono text-[15px] font-bold transition ${
                  sol === preset
                    ? 'border-[#f0c850]/60 bg-[#f0c850]/10 text-[#f0c850]'
                    : 'border-muted/20 text-muted/70 hover:border-muted/40 hover:text-ink'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          <label className="mt-4 block">
            <span className="text-[11px] uppercase tracking-[0.12em] text-muted/50">Custom amount (SOL)</span>
            <input
              type="number"
              inputMode="decimal"
              min={lamportsToSol(ECONOMY.DEPOSIT.MIN_LAMPORTS)}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-[12px] border border-muted/20 bg-black/40 px-3 py-2.5 font-mono text-[15px] text-ink outline-none focus:border-[#f0c850]/50"
            />
          </label>

          <p className="mt-3 text-center text-[12px] text-muted/50">
            {digs > 0 ? `≈ ${digs} digs at Shallow Grave` : ' '}
            <span className="ml-2 text-muted/35">Wallet: {walletSol.toFixed(2)} SOL</span>
          </p>

          {(error || validation) && (
            <p className={`mt-3 text-center text-[12px] ${error ? 'text-[#FF6B6B]' : 'text-muted/50'}`}>
              {error ?? validation}
            </p>
          )}

          <button
            onClick={submit}
            disabled={validation !== null}
            className="spin-btn spin-btn-mint relative mt-5 w-full rounded-[14px] bg-[#1a1725] px-4 py-3 text-[14px] font-bold uppercase tracking-[0.12em] text-[#f0c850] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="relative z-10">
              Deposit {validation === null ? `${formatSol(lamports)} SOL` : ''}
            </span>
          </button>
        </>
      )}
    </ModalShell>
  );
}
