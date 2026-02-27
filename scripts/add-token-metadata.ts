/**
 * scripts/add-token-metadata.ts
 *
 * Attaches (or updates) metadata on the DIG token mint so wallets
 * display "DIG Pickaxe" instead of "Unknown".
 *
 * Reads TREASURY_KEYPAIR and NEXT_PUBLIC_DIG_TOKEN_MINT from .env.local.
 *
 * Usage:
 *   npx tsx scripts/add-token-metadata.ts
 *   npx tsx scripts/add-token-metadata.ts --name "New Name" --symbol "NEW"
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  createMetadataAccountV3,
  updateMetadataAccountV2,
  findMetadataPda,
} from '@metaplex-foundation/mpl-token-metadata';
import { publicKey, signerIdentity } from '@metaplex-foundation/umi';
import { createSignerFromKeypair } from '@metaplex-foundation/umi';
import * as fs from 'fs';
import * as path from 'path';
import bs58 from 'bs58';

const RPC_URL = 'https://api.devnet.solana.com';
const ENV_PATH = path.join(process.cwd(), '.env.local');

// Defaults — override with --name and --symbol flags
const DEFAULT_NAME = 'DIG Pickaxe';
const DEFAULT_SYMBOL = 'DIG';
const DEFAULT_URI = ''; // no off-chain JSON for now

function readEnvVar(name: string): string | undefined {
  try {
    const content = fs.readFileSync(ENV_PATH, 'utf-8');
    const match = content.match(new RegExp(`^${name}=(.+)$`, 'm'));
    return match?.[1]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

function parseArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1];
  }
  return undefined;
}

async function main() {
  const treasurySecret = readEnvVar('TREASURY_KEYPAIR');
  const mintAddress = readEnvVar('NEXT_PUBLIC_DIG_TOKEN_MINT');

  if (!treasurySecret) {
    console.error('TREASURY_KEYPAIR not found in .env.local');
    process.exit(1);
  }
  if (!mintAddress) {
    console.error('NEXT_PUBLIC_DIG_TOKEN_MINT not found in .env.local');
    process.exit(1);
  }

  const name = parseArg('--name') ?? DEFAULT_NAME;
  const symbol = parseArg('--symbol') ?? DEFAULT_SYMBOL;
  const uri = parseArg('--uri') ?? DEFAULT_URI;

  console.log(`=== DIG Token Metadata ===\n`);
  console.log(`Mint:   ${mintAddress}`);
  console.log(`Name:   ${name}`);
  console.log(`Symbol: ${symbol}`);
  console.log(`URI:    ${uri || '(none)'}\n`);

  // Set up Umi with treasury as signer
  const umi = createUmi(RPC_URL);
  const secretKey = bs58.decode(treasurySecret);
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
  const treasurySigner = createSignerFromKeypair(umi, umiKeypair);
  umi.use(signerIdentity(treasurySigner));

  const mint = publicKey(mintAddress);
  const metadataPda = findMetadataPda(umi, { mint });

  // Check if metadata account already exists
  const metadataAccount = await umi.rpc.getAccount(metadataPda[0]);

  if (metadataAccount.exists) {
    console.log('Metadata account exists — updating...');
    await updateMetadataAccountV2(umi, {
      metadata: metadataPda,
      updateAuthority: treasurySigner,
      data: {
        name,
        symbol,
        uri,
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
      },
      isMutable: true,
      primarySaleHappened: null,
    }).sendAndConfirm(umi);
    console.log('Metadata updated!');
  } else {
    console.log('No metadata account — creating...');
    await createMetadataAccountV3(umi, {
      metadata: metadataPda,
      mint,
      mintAuthority: treasurySigner,
      payer: treasurySigner,
      updateAuthority: treasurySigner.publicKey,
      data: {
        name,
        symbol,
        uri,
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
      },
      isMutable: true,
      collectionDetails: null,
    }).sendAndConfirm(umi);
    console.log('Metadata created!');
  }

  console.log(`\nPhantom/Backpack will now show "${name}" (${symbol}) instead of "Unknown".`);
  console.log('To rename later: npx tsx scripts/add-token-metadata.ts --name "New Name" --symbol "NEW"');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
