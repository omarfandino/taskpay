#!/usr/bin/env bash
# Swap USDC → USDm on Sepolia and send USDm to MiniPay.
# 1. Send USDC from MiniPay to DEPLOYER_ADDRESS (in .env)
# 2. Faucet CELO to DEPLOYER_ADDRESS at faucet.celo.org/celo-sepolia
# 3. Run: pnpm fund:minipay

set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Missing .env — run wallet setup first"
  exit 1
fi

source .env
echo "Deployer: $DEPLOYER_ADDRESS"
echo "MiniPay:  $MINIPAY_ADDRESS"
echo ""

export PATH="$HOME/.foundry/bin:$PATH"
CELO=$(cast from-wei "$(cast balance "$DEPLOYER_ADDRESS" --rpc-url https://forno.celo-sepolia.celo-testnet.org)" 2>/dev/null || echo 0)
USDC_RAW=$(cast call 0x01C5C0122039549AD1493B8220cABEdD739BC44E "balanceOf(address)(uint256)" "$DEPLOYER_ADDRESS" --rpc-url https://forno.celo-sepolia.celo-testnet.org 2>/dev/null | awk '{print $1}')
USDC=$(python3 -c "print(int('${USDC_RAW:-0}')/1e6)" 2>/dev/null || echo 0)
echo "Balances — CELO: $CELO | USDC: $USDC"
echo ""

if [ "${USDC_RAW:-0}" = "0" ]; then
  echo "⚠ Need USDC. Send ~10 USDC from MiniPay to:"
  echo "  $DEPLOYER_ADDRESS"
  exit 1
fi

echo "ℹ Gas: using USDC feeCurrency (no CELO required)"
echo ""

node scripts/swap-usdc-to-usdm.mjs "${1:-10}" "${2:-8}"
