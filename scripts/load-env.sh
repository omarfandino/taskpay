# shellcheck shell=bash
# Load taskpay/.env when PRIVATE_KEY is not already exported.
load_taskpay_env() {
  local root
  root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  if [ -n "${PRIVATE_KEY:-}" ]; then
    return 0
  fi
  if [ ! -f "$root/.env" ]; then
    return 0
  fi
  set -a
  # shellcheck disable=SC1091
  . "$root/.env"
  set +a
}
