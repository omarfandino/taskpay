import { parseUnits } from "viem";
import { CHAIN_IDS, TOKEN_ADDRESSES } from "./constants";

/** One-time welcome transfer for new wallets (network fees). */
export const WELCOME_USDC_AMOUNT = parseUnits("1", 6);

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
