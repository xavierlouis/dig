// src/app/api/claim-reward/route.ts

import { NextResponse } from 'next/server';
import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import bs58 from 'bs58';
import type { TierName } from '@/services/types';

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
const TREASURY_KEYPAIR = process.env.TREASURY_KEYPAIR ?? '';

// Anti-replay: in-memory set of used reveal IDs
const usedRevealIds = new Set<string>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { revealId, choice, amount, walletAddress, tier } = body as {
      revealId: string;
      choice: 'sol' | 'token';
      amount: number;
      walletAddress: string;
      tier: TierName;
    };

    // Validate inputs
    if (!revealId || !choice || !walletAddress || tier === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Anti-replay check
    if (usedRevealIds.has(revealId)) {
      return NextResponse.json({ error: 'Reward already claimed' }, { status: 409 });
    }

    // Dust tier — no payout
    if (amount <= 0 || tier === 'dust') {
      usedRevealIds.add(revealId);
      return NextResponse.json({ amount: 0, txSignature: null });
    }

    const connection = new Connection(RPC_URL, 'confirmed');
    const treasuryKeypair = Keypair.fromSecretKey(bs58.decode(TREASURY_KEYPAIR));
    const playerPubkey = new PublicKey(walletAddress);
    const lamports = Math.round(amount * LAMPORTS_PER_SOL);

    // Transfer SOL from treasury to player
    // Both 'sol' and 'token' choices pay SOL for MVP
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasuryKeypair.publicKey,
        toPubkey: playerPubkey,
        lamports,
      }),
    );

    const txSignature = await sendAndConfirmTransaction(connection, tx, [treasuryKeypair]);

    // Mark reveal as claimed (anti-replay)
    usedRevealIds.add(revealId);

    return NextResponse.json({ amount, txSignature });
  } catch (err) {
    console.error('claim-reward error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
