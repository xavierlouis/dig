// src/services/blockchain/blockchainDigService.ts

import {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  createBurnInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import type { IDigService } from '../interfaces';
import type { LevelId, LevelSession, TombReveal, ClaimResult } from '../types';
import { ECONOMY } from '@/config/economy';
import { getTodaysToken } from '@/config/daily';
import { rollTier, createRevealLog, logReveal } from '@/lib/random';
import { calculateSolPayout, calculateTokenPayout, calculateJackpotPayout } from '@/lib/economy';
import { getWalletContext, refreshBalances } from './solanaHelpers';

const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS ?? '';
const DIG_TOKEN_MINT = process.env.NEXT_PUBLIC_DIG_TOKEN_MINT ?? '';

let sessionCounter = 0;
let revealCounter = 0;

const sessions = new Map<string, LevelSession>();
const reveals = new Map<string, TombReveal>();

function generateSessionId(): string {
  return `session-${++sessionCounter}-${Date.now()}`;
}

function generateRevealId(): string {
  return `reveal-${++revealCounter}-${Date.now()}`;
}

export const blockchainDigService: IDigService = {
  async mintDigs(level: LevelId, count: number): Promise<number> {
    const { wallet, connection } = getWalletContext();
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    const config = ECONOMY.LEVELS[level];
    const lamports = Math.round(config.price * LAMPORTS_PER_SOL);
    const treasury = new PublicKey(TREASURY_ADDRESS);

    // Build SOL transfer tx
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: treasury,
        lamports,
      }),
    );

    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = wallet.publicKey;

    // User signs
    const signed = await wallet.signTransaction(tx);
    const txSignature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(txSignature, 'confirmed');

    // Call server to mint SPL tokens
    const res = await fetch('/api/mint-digs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        txSignature,
        walletAddress: wallet.publicKey.toBase58(),
        level,
        count,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Mint failed' }));
      throw new Error(err.error ?? 'Mint failed');
    }

    const { newBalance } = await res.json();

    // Reconcile balances from chain
    await refreshBalances();

    return newBalance;
  },

  async startRound(level: LevelId): Promise<LevelSession> {
    // Client-only visual grouping — identical to mock
    const token = getTodaysToken();
    const sessionId = generateSessionId();
    const session: LevelSession = {
      id: sessionId,
      level,
      tokenId: token.id,
      tombs: [
        { index: 0, status: 'sealed' },
        { index: 1, status: 'sealed' },
        { index: 2, status: 'sealed' },
      ],
    };

    sessions.set(sessionId, session);
    return session;
  },

  async digAll(roundId: string): Promise<TombReveal[]> {
    const { wallet, connection } = getWalletContext();
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    const session = sessions.get(roundId);
    if (!session) throw new Error(`Round ${roundId} not found`);

    const count = session.tombs.length;

    // Build SPL burn tx (burn all digs in one transaction)
    const mint = new PublicKey(DIG_TOKEN_MINT);
    const ata = await getAssociatedTokenAddress(mint, wallet.publicKey);

    const tx = new Transaction().add(
      createBurnInstruction(
        ata,
        mint,
        wallet.publicKey,
        count, // burn 3 tokens (0 decimals)
      ),
    );

    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = wallet.publicKey;

    const signed = await wallet.signTransaction(tx);
    const txSignature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(txSignature, 'confirmed');

    // Roll all tiers client-side
    const token = getTodaysToken();
    const level = session.level;
    const allReveals: TombReveal[] = [];

    for (let i = 0; i < count; i++) {
      const { tier, roll, seed } = rollTier();
      const revealId = generateRevealId();

      const solPayout = calculateSolPayout(tier, level);
      const tokenPayout = calculateTokenPayout(tier, level);

      let finalSolPayout = solPayout;
      if (tier === 'resurrect') {
        finalSolPayout = calculateJackpotPayout(1.0);
      }

      const reveal: TombReveal = {
        id: revealId,
        tombIndex: i,
        tokenId: token.id,
        tier,
        solPayout: finalSolPayout,
        tokenPayout: tokenPayout || finalSolPayout * ECONOMY.OPTION_B_PREMIUM,
        choice: null,
        actualPayout: finalSolPayout,
      };

      reveals.set(revealId, reveal);

      const tomb = session.tombs[i];
      if (tomb) {
        tomb.status = 'opened';
        tomb.reveal = reveal;
      }

      const logEntry = createRevealLog(
        roundId, i, tier, roll, seed, finalSolPayout, tokenPayout,
      );
      logReveal(logEntry);

      allReveals.push(reveal);
    }

    // Refresh dig balance from chain
    await refreshBalances();

    return allReveals;
  },

  async claimReward(revealId: string, choice: 'sol' | 'token'): Promise<ClaimResult> {
    const reveal = reveals.get(revealId);
    if (!reveal) throw new Error(`Reveal ${revealId} not found`);

    reveal.choice = choice;
    const amount = choice === 'sol' ? reveal.solPayout : reveal.tokenPayout;
    reveal.actualPayout = amount;

    // Skip server call for Dust (0 payout)
    if (amount <= 0) {
      return { revealId, choice, amount };
    }

    const { wallet } = getWalletContext();
    if (!wallet.publicKey) throw new Error('Wallet not connected');

    // Call server to send SOL from treasury
    const res = await fetch('/api/claim-reward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        revealId,
        choice,
        amount,
        walletAddress: wallet.publicKey.toBase58(),
        tier: reveal.tier,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Claim failed' }));
      throw new Error(err.error ?? 'Claim failed');
    }

    const result = await res.json();

    // Reconcile balances
    await refreshBalances();

    return {
      revealId,
      choice,
      amount: result.amount,
      tokenSymbol: choice === 'token' ? reveal.tokenId : undefined,
    };
  },
};
