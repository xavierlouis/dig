# DIG — Daily Tomb-Raiding on Solana's Token Graveyard

DIG is a daily game where players mint dig packs, open tombs, and unearth prizes from Solana's dead token graveyard. On winning reveals, choose between safe SOL or a higher-value allocation of the day's featured dead token. A portion of every pack sale buys that token on-market, creating real buy pressure — literally resurrecting dead tokens.

## How It Works

1. **Connect wallet** — Phantom, Backpack, or any Wallet Standard compatible wallet
2. **Mint a Pickaxe Pack** (0.06 SOL) — contains 3 digs
3. **Enter the level** — explore the cave and open 3 tombs
4. **Reveal your tier** — Dust, Bone, Coffin, Zombie, or the rare Resurrect (jackpot)
5. **Choose your reward** — safe SOL or a premium allocation of today's dead token

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Styling:** Tailwind CSS v4 + Framer Motion
- **Game Engine:** HTML5 Canvas (tomb rendering, animations, particles)
- **Particles:** tsparticles (fireflies, cave dust)
- **Audio:** Howler.js (ambient music + sound effects)
- **State:** Zustand
- **Blockchain:** @solana/web3.js, Wallet Adapter, SPL Token
- **Deploy:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- A Solana wallet (Phantom recommended)

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Mock Mode (no wallet needed)

By default, the app runs in mock mode with a simulated wallet and balances. No Solana connection required.

### Blockchain Mode

To enable real Solana transactions:

1. Run the devnet setup script to create a treasury wallet and SPL token mint:
   ```bash
   npx tsx scripts/setup-devnet.ts
   ```

2. Create `.env.local` with the output values:
   ```env
   NEXT_PUBLIC_USE_BLOCKCHAIN=true
   NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
   NEXT_PUBLIC_SOLANA_NETWORK=devnet
   NEXT_PUBLIC_TREASURY_ADDRESS=<your treasury pubkey>
   NEXT_PUBLIC_DIG_TOKEN_MINT=<your mint address>
   TREASURY_KEYPAIR=<base58 encoded secret key>
   ```

3. Optionally add token metadata (so the token shows as "DIG Pickaxe" in wallets):
   ```bash
   npx tsx scripts/add-token-metadata.ts
   ```

4. Restart the dev server.

## Economy

| Split | % |
|---|---|
| Prize Pool | 60% |
| Token Buy Pressure | 20% |
| Treasury | 15% |
| Jackpot | 5% |

| Tier | Odds | SOL Payout |
|---|---|---|
| Dust | 65% | 0 |
| Bone | 20% | 0.005 |
| Coffin | 10% | 0.03 |
| Zombie | 4.5% | 0.10 |
| Resurrect | 0.5% | Jackpot |

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── page.tsx          # Home (hero + pack shop)
│   ├── level/page.tsx    # Level experience (canvas game)
│   └── api/              # Server routes (mint-digs, claim-reward)
├── components/
│   ├── DigHero.tsx       # Featured token tombstone display
│   ├── PackShop.tsx      # Pack minting + level entry
│   └── level/            # Canvas game engine + overlays
├── services/
│   ├── mock/             # Mock service (local play)
│   └── blockchain/       # Real Solana service
├── store/                # Zustand state
├── config/               # Economy config, daily token rotation
└── lib/                  # RNG, sound engine, economy math
```

## Deploy

Deployed on Vercel. Set all environment variables in **Project Settings > Environment Variables** and redeploy.

## License

Private — all rights reserved.
