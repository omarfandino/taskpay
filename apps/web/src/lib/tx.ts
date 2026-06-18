import { TOKEN_ADDRESSES, CHAIN_IDS, DEFAULT_CHAIN_ID } from "./constants";
import { MINIPAY_FEE_TEST } from "./minipay-fee-test";

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

export function feeCurrencyFor(
  chainId?: number
): { feeCurrency: `0x${string}` } | Record<string, never> {
  if (MINIPAY_FEE_TEST) {
    // MiniPay FAQ: wallet picks stablecoin with highest balance.
    return {};
  }
  return { feeCurrency: getUsdmAddress(chainId) };
}
