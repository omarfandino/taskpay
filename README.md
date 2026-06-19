# TaskPay

MiniPay micro-task marketplace on Celo. Post real-world verification tasks with **COPm** rewards locked in escrow. Takers submit photo evidence; posters approve and pay.

Built for [Agentes Onchain Colombia](https://hackathon.celocolombia.org/) — Demo Day June 19, 2026.

## Features

- **COPm escrow** — rewards held in `TaskPay.sol` until approval
- **Fee abstraction** — MiniPay pays gas in USDC (no CELO required for users)
- **Auto-connect** — no Connect Wallet button inside MiniPay
- **Photo evidence** — Supabase storage (no gas); URL anchored onchain at complete
- **Welcome USDC** — new wallets receive **1 USDC** once for network fees
- **Mobile-first** — single column, bottom nav, English UI

## Stack

- Next.js 14 (App Router) + Tailwind
- wagmi v2 + viem
- Foundry (TaskPay.sol)
- Supabase (evidence photos only)

## Quick start

```bash
pnpm install
cp apps/web/.env.template apps/web/.env.local
# Set NEXT_PUBLIC_TASKPAY_ADDRESS_SEPOLIA after deploy

pnpm dev
```

## Deploy contract (Celo Sepolia)

```bash
cd apps/contracts
export PRIVATE_KEY=0x...
forge script script/DeployTaskPay.s.sol --rpc-url celo_sepolia --broadcast
```

Set `NEXT_PUBLIC_TASKPAY_ADDRESS_SEPOLIA` in `apps/web/.env.local`.

Current Sepolia deploy (with `completeTask`): `0x7c9F688C05dcb2f2311cB296dE2D8f1842f8A47A`

## Fund wallets for testing

`taskpay/.env` needs `PRIVATE_KEY` (deployer) and `MINIPAY_ADDRESS` (your MiniPay phone wallet).

### Gas (USDC) — MiniPay users

1. [Circle faucet](https://faucet.circle.com/) → select **Celo Sepolia** → your MiniPay address  
   Or enable **Welcome USDC** in production (see below).

### Task rewards (COPm) — MiniPay users

From your PC (deployer needs **USDC + CELO** on Sepolia):

```bash
# 1. Circle faucet → deployer address (USDC)
# 2. CELO faucet → deployer (https://faucet.celo.org/celo-sepolia)
# 3. Swap USDC → COPm and send to MiniPay:
pnpm fund:copm 5
# Or send COPm to another wallet (e.g. taker):
pnpm fund:copm 5 0x1823CF07c8F0FB9EFF63752AB1ef9df3c2d60656
```

| Command | Purpose |
|---------|---------|
| `pnpm fund:copm [usdc] [0xRecipient]` | Swap USDC → COPm on **deployer**, send COPm to recipient (default: `MINIPAY_ADDRESS`) |
| `pnpm fund:usdc [amount] [0xRecipient]` | Send USDC from **deployer** (default: 1 USDC to `MINIPAY_ADDRESS`) |

**In MiniPay:** you can also swap USDC → COPm inside the wallet (Mento) if you already have USDC.

## Welcome faucet (automatic, production)

On first connect, the app calls `POST /api/welcome-usdc` to send **1 USDC** once per wallet.

**Vercel / `.env.local` (server-only):**

| Variable | Description |
|----------|-------------|
| `WELCOME_FUNDER_PRIVATE_KEY` | Deployer private key — must hold **USDC + CELO** (gas for the transfer) |
| `NEXT_PUBLIC_SUPABASE_URL` | For `welcome_claims` dedup table |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same project |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional, recommended |

Run `welcome_claims` section in `supabase/setup.sql`.

If `WELCOME_FUNDER_PRIVATE_KEY` is unset, the welcome banner is skipped and users fund via Circle faucet.

## Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Run `supabase/setup.sql`
3. Set `NEXT_PUBLIC_SUPABASE_URL` (base URL, **no** `/rest/v1/`) and anon key

## Test in MiniPay

1. Enable Developer Mode + Use Testnet in MiniPay
2. Open your Vercel production URL (or ngrok for local)
3. Run full flow: post → take → photo → complete → approve

## Deploy frontend (Vercel)

Root directory: `apps/web`

Env vars:

- `NEXT_PUBLIC_TASKPAY_ADDRESS_SEPOLIA` — `0x7c9F688C05dcb2f2311cB296dE2D8f1842f8A47A`
- `NEXT_PUBLIC_DEMO_STORAGE_MODE=false`
- `NEXT_PUBLIC_SUPABASE_URL` — `https://YOUR-PROJECT.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `WELCOME_FUNDER_PRIVATE_KEY` (server-only)
- `SUPABASE_SERVICE_ROLE_KEY` (optional)

## Pitch

> Get paid in digital Colombian pesos for completing real-world micro-tasks from your phone. COPm locked in escrow — nobody can steal the reward. Evidence URL stored onchain forever.

## License

MIT
