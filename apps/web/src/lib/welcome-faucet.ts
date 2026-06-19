import { parseUnits } from "viem";
import { CHAIN_IDS, TOKEN_ADDRESSES } from "./constants";

export type WelcomeClient = "minipay" | "browser";

/** One-time welcome transfer for new MiniPay wallets (network fees via fee abstraction). */
export const WELCOME_USDC_AMOUNT = parseUnits("1", 6);

/** One-time welcome transfer for new browser wallets (native network fees). */
export const WELCOME_CELO_AMOUNT = parseUnits("1", 18);

/** Warn when below this — one takeTask fee is ~0.01 USDC on Sepolia. */
export const MIN_USDC_FOR_FEES = parseUnits("0.05", 6);

/** Warn when below this on browser — native gas on Sepolia. */
export const MIN_CELO_FOR_FEES = parseUnits("0.1", 18);

export const CELO_SEPOLIA_RPC =
  "https://forno.celo-sepolia.celo-testnet.org";

export function getWelcomeUsdcAddress(): `0x${string}` {
  return TOKEN_ADDRESSES[CHAIN_IDS.celoSepolia].usdc;
}

export function normalizeWalletAddress(address: string): `0x${string}` {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error("Invalid wallet address.");
  }
  return address.toLowerCase() as `0x${string}`;
}
