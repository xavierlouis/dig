// src/app/api/mint-digs/route.ts

import { NextResponse } from 'next/server';
import {
  Connection,
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  mintTo,
  getOrCreateAssociatedTokenAccount,
} from '@solana/spl-token';
import bs58 from 'bs58';
import { ECONOMY } from '@/config/economy';
import type { LevelId } from '@/services/types';

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';
const DIG_TOKEN_MINT = process.env.NEXT_PUBLIC_DIG_TOKEN_MINT ?? '';
const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS ?? '';
const TREASURY_KEYPAIR = process.env.TREASURY_KEYPAIR ?? '';

// Anti-replay: in-memory set of used tx signatures
const usedSignatures = new Set<string>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { txSignature, walletAddress, level, count } = body as {
      txSignature: string;
      walletAddress: string;
      level: LevelId;
      count: number;
    };

    // Validate inputs
    if (!txSignature || !walletAddress || !level || !count) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Anti-replay check
    if (usedSignatures.has(txSignature)) {
      return NextResponse.json({ error: 'Transaction already used' }, { status: 409 });
    }

    const connection = new Connection(RPC_URL, 'confirmed');

    // Verify the SOL payment on-chain
    const txInfo = await connection.getTransaction(txSignature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!txInfo || !txInfo.meta) {
      return NextResponse.json({ error: 'Transaction not found or not confirmed' }, { status: 400 });
    }

    if (txInfo.meta.err) {
      return NextResponse.json({ error: 'Transaction failed on-chain' }, { status: 400 });
    }

    // Verify payment amount and destination
    const config = ECONOMY.LEVELS[level];
    const expectedLamports = Math.round(config.price * LAMPORTS_PER_SOL);
    const treasuryPubkey = new PublicKey(TREASURY_ADDRESS);

    // Check pre/post balances for the treasury account
    const accountKeys = txInfo.transaction.message.getAccountKeys();
    let treasuryIndex = -1;
    for (let i = 0; i < accountKeys.length; i++) {
      if (accountKeys.get(i)?.equals(treasuryPubkey)) {
        treasuryIndex = i;
        break;
      }
    }

    if (treasuryIndex === -1) {
      return NextResponse.json({ error: 'Treasury not found in transaction' }, { status: 400 });
    }

    const preBalance = txInfo.meta.preBalances[treasuryIndex] ?? 0;
    const postBalance = txInfo.meta.postBalances[treasuryIndex] ?? 0;
    const received = postBalance - preBalance;

    if (received < expectedLamports) {
      return NextResponse.json(
        { error: `Insufficient payment: expected ${expectedLamports}, received ${received}` },
        { status: 400 },
      );
    }

    // Mark signature as used (anti-replay)
    usedSignatures.add(txSignature);

    // Mint DIG tokens to player
    const treasuryKeypair = Keypair.fromSecretKey(bs58.decode(TREASURY_KEYPAIR));
    const mint = new PublicKey(DIG_TOKEN_MINT);
    const playerPubkey = new PublicKey(walletAddress);

    // Get or create player's ATA (treasury pays rent if needed)
    const playerAta = await getOrCreateAssociatedTokenAccount(
      connection,
      treasuryKeypair, // payer for ATA creation
      mint,
      playerPubkey,
    );

    // Mint tokens (count = DIGS_PER_PACK = 3)
    await mintTo(
      connection,
      treasuryKeypair, // payer
      mint,
      playerAta.address,
      treasuryKeypair, // mint authority
      count,           // amount (0 decimals → count tokens)
    );

    const newBalance = Number(playerAta.amount) + count;

    return NextResponse.json({ newBalance });
  } catch (err) {
    console.error('mint-digs error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
