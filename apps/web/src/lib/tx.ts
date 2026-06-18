import { TOKEN_ADDRESSES, CHAIN_IDS, DEFAULT_CHAIN_ID } from "./constants";

export function getUsdmAddress(chainId?: number): `0x${string}` {
  const id = chainId ?? DEFAULT_CHAIN_ID;
  if (id === CHAIN_IDS.celo) {
    return TOKEN_ADDRESSES[CHAIN_IDS.celo].usdm;
  }
  return TOKEN_ADDRESSES[CHAIN_IDS.celoSepolia].usdm;
}

export function getUsdcAddress(chainId?: number): `0x${string}` {
  const id = chainId ?? DEFAULT_CHAIN_ID;
  if (id === CHAIN_IDS.celo) {
    return TOKEN_ADDRESSES[CHAIN_IDS.celo].usdc;
  }
  return TOKEN_ADDRESSES[CHAIN_IDS.celoSepolia].usdc;
}

export function getCopmAddress(chainId?: number): `0x${string}` {
  const id = chainId ?? DEFAULT_CHAIN_ID;
  if (id === CHAIN_IDS.celo) {
    return TOKEN_ADDRESSES[CHAIN_IDS.celo].copm;
  }
  return TOKEN_ADDRESSES[CHAIN_IDS.celoSepolia].copm;
}

/** Omit feeCurrency so MiniPay picks the user's stablecoin (typically USDC on Sepolia). */
export function feeCurrencyFor(): Record<string, never> {
  return {};
}
