# MiniPay fee test branch (`test/minipay-no-feecurrency`)

## Hypothesis

If we **omit `feeCurrency`** on transactions, MiniPay will deduct network fees from the user's stablecoin balance (typically the token they hold most of — e.g. USDC from [Circle faucet](https://faucet.circle.com/)).

References:

- [MiniPay FAQ](https://docs.minipay.xyz/faq.html) — *"MiniPay typically pays gas with the token the user has the most of"*
- [Hackathon equipos](https://hackathon.celocolombia.org/equipos) — do not require CELO in the UI

## What changed

- `MINIPAY_FEE_TEST = true` in `apps/web/src/lib/minipay-fee-test.ts`
- `feeCurrencyFor()` returns `{}` (no `feeCurrency` on writes)
- Welcome USDm faucet **disabled** on this branch
- Amber banner at top explains the test

## How to test (15 min)

1. Checkout branch: `git checkout test/minipay-no-feecurrency`
2. Deploy or run locally + ngrok / Vercel preview from this branch
3. **Do not** use welcome — fund wallet only via Circle:
   - Network: **Celo Sepolia**
   - Address: your MiniPay wallet
   - Amount: 20 USDC
4. Open TaskPay in MiniPay (Developer Mode → Load Test Page)
5. Note USDC balance **before** `takeTask`
6. Take an open task → confirm tx
7. Note USDC balance **after** and check Celoscan fee token

## Record results

| Step | Pass? | Notes |
|------|-------|-------|
| `takeTask` confirms | | |
| Fee deducted from USDC | | |
| No CELO required in UI | | |
| `completeTask` works | | |
| `postTask` (poster, needs COPm) | | |

## If test passes

- Merge approach to `master`: USDC faucet + no `feeCurrency` + optional welcome off
- Update README / remove swap-to-USDm for users

## If test fails

- Revert `MINIPAY_FEE_TEST` to `false` on `master`
- Keep `feeCurrency: USDm` (explicit MiniPay support)
- Keep welcome USDm or fund via `pnpm fund:minipay`

## Revert to production fees

Set `MINIPAY_FEE_TEST = false` in `minipay-fee-test.ts` and re-enable `WelcomeUsdmBanner` in layout.
