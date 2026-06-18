# TaskPay

MiniPay micro-task marketplace on Celo. Post real-world verification tasks with **COPm** rewards locked in escrow. Takers submit photo evidence; posters approve and pay.

Built for [Agentes Onchain Colombia](https://hackathon.celocolombia.org/) — Demo Day June 19, 2026.

## Features

- **COPm escrow** — rewards held in `TaskPay.sol` until approval
- **USDm fee abstraction** — gas paid in USDm via MiniPay
- **Auto-connect** — no Connect Wallet button inside MiniPay
- **Photo evidence** — Supabase storage (no gas); URL anchored onchain at complete
- **Welcome USDm** — new wallets receive 0.5 USDm for network fees (API + CLI)
- **Mobile-first** — single column, bottom nav, English UI

## Stack

- Next.js 14 (App Router) + Tailwind
- wagmi v2 + viem
- Foundry (TaskPay.sol)
- Supabase (evidence photos only)

## Quick start

```bash
pnpm install
cp .env.example apps/web/.env.local
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

## Fund wallets (deployer on PC)

`taskpay/.env` needs `PRIVATE_KEY` (deployer). Optional `MINIPAY_ADDRESS` for the default MiniPay phone.

| Command | Purpose |
|---------|---------|
| `pnpm fund:swap [usdc] [usdm]` | Swap USDC → USDm on deployer (treasury) |
| `pnpm fund:welcome <0xAddress> [0.5]` | Send USDm directly (2nd phone / manual) |
| `pnpm fund:minipay` | Swap + send USDm to `MINIPAY_ADDRESS` |

Deployer pays gas in CELO; users pay tx fees in **USDm**. Takers earn **COPm** rewards (not gas).

## Welcome faucet (automatic)

On first connect, the app calls `POST /api/welcome-usdm` to send **0.5 USDm** once per wallet.

Server env in `apps/web` (Vercel + `.env.local`):

- `WELCOME_FUNDER_PRIVATE_KEY` — deployer private key (never `NEXT_PUBLIC_`)
- Run `welcome_claims` section in `supabase/setup.sql`

## Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Run `supabase/setup.sql`
3. Create public bucket `task-evidence`
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Test in MiniPay

1. Enable Developer Mode + Use Testnet in MiniPay
2. `pnpm dev` + `ngrok http 3000`
3. Load ngrok URL via Load Test Page
4. Run full flow with 2–3 wallets (5+ txs for hackathon rubric)

## Deploy frontend (Vercel)

Root directory: `apps/web`

Env vars:

- `NEXT_PUBLIC_TASKPAY_ADDRESS_SEPOLIA` — `0x7c9F688C05dcb2f2311cB296dE2D8f1842f8A47A`
- `NEXT_PUBLIC_DEMO_STORAGE_MODE=false`
- Supabase URL + anon key
- `WELCOME_FUNDER_PRIVATE_KEY` (server-only, same deployer as `PRIVATE_KEY` on PC)

## Pitch

> Get paid in digital Colombian pesos for completing real-world micro-tasks from your phone. COPm locked in escrow — nobody can steal the reward. Evidence URL stored onchain forever.

## License

MIT
