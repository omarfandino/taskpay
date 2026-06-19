#!/usr/bin/env bash
set -euo pipefail

# Deploy TaskPay to Celo Sepolia (contract only, no seed tasks).
# Requires: PRIVATE_KEY with CELO for gas on Sepolia

export PATH="$HOME/.foundry/bin:$PATH"
# shellcheck disable=SC1091
source "$(dirname "$0")/load-env.sh"
load_taskpay_env
cd "$(dirname "$0")/../apps/contracts"

if [ -z "${PRIVATE_KEY:-}" ]; then
  echo "Error: set PRIVATE_KEY in taskpay/.env or export it in your shell"
  exit 1
fi

forge script script/DeployTaskPay.s.sol \
  --rpc-url celo_sepolia \
  --broadcast \
  --legacy

echo ""
echo "Add to apps/web/.env.local:"
echo "NEXT_PUBLIC_TASKPAY_ADDRESS_SEPOLIA=<address from output above>"
