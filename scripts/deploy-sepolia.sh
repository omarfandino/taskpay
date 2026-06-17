#!/usr/bin/env bash
set -euo pipefail

# Deploy TaskPay to Celo Sepolia and seed 3 demo tasks.
# Requires: PRIVATE_KEY with CELO + COPm on Sepolia

export PATH="$HOME/.foundry/bin:$PATH"
cd "$(dirname "$0")/../apps/contracts"

if [ -z "${PRIVATE_KEY:-}" ]; then
  echo "Error: set PRIVATE_KEY (deployer with COPm on Sepolia)"
  exit 1
fi

forge script script/DeployTaskPay.s.sol \
  --rpc-url celo_sepolia \
  --broadcast \
  --legacy

echo ""
echo "Add to apps/web/.env.local:"
echo "NEXT_PUBLIC_TASKPAY_ADDRESS_SEPOLIA=<address from output above>"
