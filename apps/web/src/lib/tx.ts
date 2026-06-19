import { TOKEN_ADDRESSES, CHAIN_IDS, DEFAULT_CHAIN_ID } from "./constants";
import { MIN_USDC_FOR_FEES } from "./welcome-faucet";

export function getUsdcAddress(chainId?: number): `0x${string}` {
  const id = chainId ?? DEFAULT_CHAIN_ID;
  if (id === CHAIN_IDS.celo) {
    return TOKEN_ADDRESSES[CHAIN_IDS.celo].usdc;
  }
  return TOKEN_ADDRESSES[CHAIN_IDS.celoSepolia].usdc;
}

export function getUsdcAdapterAddress(chainId?: number): `0x${string}` {
  const id = chainId ?? DEFAULT_CHAIN_ID;
  if (id === CHAIN_IDS.celo) {
    return TOKEN_ADDRESSES[CHAIN_IDS.celo].usdcAdapter;
  }
  return TOKEN_ADDRESSES[CHAIN_IDS.celoSepolia].usdcAdapter;
}

export function getCopmAddress(chainId?: number): `0x${string}` {
  const id = chainId ?? DEFAULT_CHAIN_ID;
  if (id === CHAIN_IDS.celo) {
    return TOKEN_ADDRESSES[CHAIN_IDS.celo].copm;
  }
  return TOKEN_ADDRESSES[CHAIN_IDS.celoSepolia].copm;
}

type FeeCurrencyOptions = {
  /** Browser MetaMask: pay network fees with USDC when balance is sufficient. */
  payFeesWithUsdc?: boolean;
};

export function feeCurrencyFor(
  chainId?: number,
  options?: FeeCurrencyOptions
): { feeCurrency?: `0x${string}` } {
  if (options?.payFeesWithUsdc) {
    return { feeCurrency: getUsdcAdapterAddress(chainId) };
  }
  return {};
}

export function shouldPayBrowserFeesWithUsdc(
  usdcBalance: bigint | undefined
): boolean {
  return usdcBalance !== undefined && usdcBalance >= MIN_USDC_FOR_FEES;
}
