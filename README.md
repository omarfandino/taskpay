# TaskPay

MiniPay micro-task marketplace on Celo. Post real-world verification tasks with **COPm** rewards locked in escrow. Takers submit photo evidence; posters approve and pay.

Built for [Agentes Onchain Colombia](https://hackathon.celocolombia.org/) — Demo Day June 19, 2026.

## Features

- **COPm escrow** — rewards held in `TaskPay.sol` until approval
- **USDm fee abstraction** — gas paid in USDm via MiniPay
- **Auto-connect** — no Connect Wallet button inside MiniPay
- **Photo evidence** — Supabase storage, URL stored onchain
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

Env vars: `NEXT_PUBLIC_TASKPAY_ADDRESS_SEPOLIA`, Supabase keys, optionally mainnet address.

## Pitch

> Get paid in digital Colombian pesos for completing real-world micro-tasks from your phone. COPm locked in escrow — nobody can steal the reward. Evidence URL stored onchain forever.

## License

MIT
