# MiniPay E2E Testing Guide

## Prerequisites

- TaskPay deployed on Celo Sepolia (`NEXT_PUBLIC_TASKPAY_ADDRESS_SEPOLIA` set)
- MiniPay app with **Developer Mode** + **Use Testnet** enabled
- 2–3 wallets with COPm + USDm (faucet CELO → swap in MiniPay/Mento)
- Supabase configured for evidence upload (optional for take/approve flow test)

## Local testing with ngrok

```bash
cd taskpay
pnpm dev
# In another terminal:
ngrok http 3000
```

In MiniPay: **Settings → Developer Settings → Load Test Page** → paste ngrok URL.

## Transaction checklist (5+ txs for hackathon rubric)

| # | Wallet | Action | Contract call |
|---|--------|--------|---------------|
| 1 | A (poster) | Approve COPm | `COPm.approve(TaskPay, amount)` |
| 2 | A | Post task | `postTask(...)` |
| 3 | B (taker) | Take task | `takeTask(id)` |
| 4 | B | Submit evidence | `submitEvidence(id, url)` |
| 5 | A | Approve & pay | `approveTask(id)` |

Optional extras: cancel open task, second task cycle, third wallet.

## Verify on Celoscan

Sepolia explorer: https://sepolia.celoscan.io

Filter by your TaskPay contract address to show all activity to judges.

## Timing target

Primary actions (take task, post after allowance) should complete in **under 60 seconds**.

## Troubleshooting

- **No Connect button in MiniPay** — expected; auto-connect via `useMiniPay`
- **Tx fails** — ensure USDm balance for gas (fee abstraction)
- **No COPm** — swap from USDm in MiniPay or Mento testnet
- **Evidence upload fails** — check Supabase bucket `task-evidence` is public
