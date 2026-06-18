# Deployment Guide

## 1. Deploy smart contract

### Celo Sepolia (testing)

```bash
export PRIVATE_KEY=0x...
export PATH="$HOME/.foundry/bin:$PATH"
pnpm deploy:sepolia
```

Requires deployer wallet with CELO for gas on Sepolia.
No seed tasks are created — production starts with an empty task feed.

Copy the logged contract address to `apps/web/.env.local`:

```
NEXT_PUBLIC_TASKPAY_ADDRESS_SEPOLIA=0x...
```

### Verify on Celoscan

```bash
cd apps/contracts
forge verify-contract <ADDRESS> TaskPay \
  --chain-id 11142220 \
  --constructor-args $(cast abi-encode "constructor(address)" 0x5F8d55c3627d2dc0a2B4afa798f877242F382F67) \
  --etherscan-api-key $CELOSCAN_API_KEY
```

### Celo Mainnet (Demo Day)

```bash
export PRIVATE_KEY=0x...
pnpm deploy:mainnet
```

Set `NEXT_PUBLIC_TASKPAY_ADDRESS_MAINNET` in Vercel.

## 2. Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Run SQL from `supabase/setup.sql`
3. Storage → New bucket `task-evidence` (public)
4. Add storage policy for anon uploads to `task-evidence/*`

Env vars:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 3. Vercel frontend

1. Import GitHub repo
2. **Root Directory:** `apps/web`
3. Framework: Next.js (auto-detected)
4. Environment variables:
   - `NEXT_PUBLIC_TASKPAY_ADDRESS_SEPOLIA`
   - `NEXT_PUBLIC_TASKPAY_ADDRESS_MAINNET` (after mainnet deploy)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Or from CLI:

```bash
cd apps/web
npx vercel --prod
```

## 4. MiniPay testing

See [docs/MINIPAY_TESTING.md](./MINIPAY_TESTING.md)

## 5. Hackathon checklist

- [ ] Contract on Sepolia or Mainnet
- [ ] Public GitHub repo
- [ ] Live Vercel URL
- [ ] Works in MiniPay browser
- [ ] 5+ onchain transactions across 2–3 wallets
