#!/usr/bin/env bash
set -euo pipefail

# Deploy TaskPay to Celo Mainnet (production Demo Day)
export PATH="$HOME/.foundry/bin:$PATH"
cd "$(dirname "$0")/../apps/contracts"

COPM_MAINNET=0x8a567e2ae79ca692bd748ab832081c45de4041ea

if [ -z "${PRIVATE_KEY:-}" ]; then
  echo "Error: set PRIVATE_KEY"
  exit 1
fi

# Update DeployTaskPay.s.sol COPM address for mainnet or use env override
forge script script/DeployTaskPay.s.sol \
  --rpc-url celo \
  --broadcast \
  --legacy

echo "Set NEXT_PUBLIC_TASKPAY_ADDRESS_MAINNET in Vercel env"
