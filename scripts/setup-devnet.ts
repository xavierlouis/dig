/**
 * scripts/setup-devnet.ts
 *
 * One-time setup script for devnet:
 * 1. Generates a treasury keypair (or loads existing from .env.local)
 * 2. Checks balance — if 0, tells you to use the web faucet
 * 3. Creates the DIG SPL token mint (0 decimals)
 * 4. Prints .env.local values to paste
 *
 * After running this, also run:
 *   npx tsx scripts/add-token-metadata.ts    # names the token "DIG Pickaxe" in wallets
 *
 * Usage:
 *   npx tsx scripts/setup-devnet.ts          # first run: generates keypair
 *   npx tsx scripts/setup-devnet.ts --mint   # after funding: creates mint
 */

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { createMint } from '@solana/spl-token';
import bs58 from 'bs58';
import * as fs from 'fs';
import * as path from 'path';

const RPC_URL = 'https://api.devnet.solana.com';
const ENV_PATH = path.join(process.cwd(), '.env.local');

function readEnvVar(name: string): string | undefined {
  try {
    const content = fs.readFileSync(ENV_PATH, 'utf-8');
    const match = content.match(new RegExp(`^${name}=(.+)$`, 'm'));
    return match?.[1]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

function updateEnvFile(vars: Record<string, string>) {
  let content = '';
  try {
    content = fs.readFileSync(ENV_PATH, 'utf-8');
  } catch {
    // file doesn't exist yet
  }

  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }
  }

  fs.writeFileSync(ENV_PATH, content.trimEnd() + '\n');
}

async function main() {
  const doMint = process.argv.includes('--mint');
  const connection = new Connection(RPC_URL, 'confirmed');

  console.log('=== DIG Devnet Setup ===\n');

  // Step 1: Get or generate treasury keypair
  let treasury: Keypair;
  const existingKey = readEnvVar('TREASURY_KEYPAIR');

  if (existingKey) {
    treasury = Keypair.fromSecretKey(bs58.decode(existingKey));
    console.log(`Loaded existing treasury: ${treasury.publicKey.toBase58()}`);
  } else {
    treasury = Keypair.generate();
    const treasurySecret = bs58.encode(treasury.secretKey);
    console.log(`Generated new treasury: ${treasury.publicKey.toBase58()}`);

    // Save keypair + address to .env.local immediately
    updateEnvFile({
      NEXT_PUBLIC_TREASURY_ADDRESS: treasury.publicKey.toBase58(),
      TREASURY_KEYPAIR: treasurySecret,
    });
    console.log('Saved keypair to .env.local\n');
  }

  // Step 2: Check balance
  const balance = await connection.getBalance(treasury.publicKey);
  const solBalance = balance / LAMPORTS_PER_SOL;
  console.log(`Treasury balance: ${solBalance} SOL`);

  if (solBalance < 0.5 && !doMint) {
    console.log('\n--- Treasury needs funding! ---');
    console.log(`Go to: https://faucet.solana.com`);
    console.log(`Paste this address: ${treasury.publicKey.toBase58()}`);
    console.log(`Request at least 2 SOL on devnet.`);
    console.log(`\nThen re-run with: npx tsx scripts/setup-devnet.ts --mint`);
    return;
  }

  // Step 3: Create mint (only with --mint flag or sufficient balance)
  const existingMint = readEnvVar('NEXT_PUBLIC_DIG_TOKEN_MINT');
  if (existingMint) {
    console.log(`\nMint already exists: ${existingMint}`);
    console.log('Delete NEXT_PUBLIC_DIG_TOKEN_MINT from .env.local to recreate.');
    printFinalEnv(treasury, existingMint);
    return;
  }

  if (solBalance < 0.01) {
    console.log('\nNot enough SOL to create mint. Fund the treasury first.');
    return;
  }

  console.log('\nCreating DIG token mint (0 decimals)...');
  const mint = await createMint(
    connection,
    treasury,           // payer
    treasury.publicKey,  // mint authority
    null,               // freeze authority (none)
    0,                  // decimals
  );
  const mintAddress = mint.toBase58();
  console.log(`DIG token mint: ${mintAddress}`);

  // Save to .env.local
  updateEnvFile({
    NEXT_PUBLIC_USE_BLOCKCHAIN: 'true',
    NEXT_PUBLIC_SOLANA_RPC_URL: RPC_URL,
    NEXT_PUBLIC_DIG_TOKEN_MINT: mintAddress,
  });

  printFinalEnv(treasury, mintAddress);
}

function printFinalEnv(treasury: Keypair, mintAddress: string) {
  console.log('\n=== .env.local is ready! ===\n');
  console.log(`NEXT_PUBLIC_USE_BLOCKCHAIN=true`);
  console.log(`NEXT_PUBLIC_SOLANA_RPC_URL=${RPC_URL}`);
  console.log(`NEXT_PUBLIC_DIG_TOKEN_MINT=${mintAddress}`);
  console.log(`NEXT_PUBLIC_TREASURY_ADDRESS=${treasury.publicKey.toBase58()}`);
  console.log(`TREASURY_KEYPAIR=<saved>`);
  console.log('\n=== Done! ===');
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
