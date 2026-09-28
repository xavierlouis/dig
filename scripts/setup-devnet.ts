/**
 * scripts/setup-devnet.ts
 *
 * One-time setup script for devnet:
 * 1. Generates a treasury keypair (or loads existing from .env.local)
 * 2. Checks balance — if low, tells you to use the web faucet
 * 3. Prints .env.local values to paste
 *
 * The jackpot vault keypair and test "dead token" mints are added in phase 4
 * (documentation/CREDIT_LEDGER_PLAN.md §9).
 *
 * Usage:
 *   npx tsx scripts/setup-devnet.ts
 */

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
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
      NEXT_PUBLIC_SOLANA_RPC_URL: RPC_URL,
    });
    console.log('Saved keypair to .env.local\n');
  }

  // Step 2: Check balance
  const balance = await connection.getBalance(treasury.publicKey);
  const solBalance = balance / LAMPORTS_PER_SOL;
  console.log(`Treasury balance: ${solBalance} SOL`);

  if (solBalance < 0.5) {
    console.log('\n--- Treasury needs funding! ---');
    console.log(`Go to: https://faucet.solana.com`);
    console.log(`Paste this address: ${treasury.publicKey.toBase58()}`);
    console.log(`Request at least 2 SOL on devnet.`);
  }

  console.log('\n=== .env.local ===\n');
  console.log(`NEXT_PUBLIC_SOLANA_RPC_URL=${RPC_URL}`);
  console.log(`NEXT_PUBLIC_TREASURY_ADDRESS=${treasury.publicKey.toBase58()}`);
  console.log(`TREASURY_KEYPAIR=<saved>`);
  console.log('\nServer mode (NEXT_PUBLIC_USE_BLOCKCHAIN=true) arrives in phase 2; keep it false until then.');
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
