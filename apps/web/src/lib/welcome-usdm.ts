import { parseUnits } from "viem";
import { CHAIN_IDS, TOKEN_ADDRESSES } from "./constants";

export const WELCOME_USDM_AMOUNT = parseUnits("0.5", 18);

export const CELO_SEPOLIA_RPC =
  "https://forno.celo-sepolia.celo-testnet.org";

export function getWelcomeUsdmAddress(): `0x${string}` {
  return TOKEN_ADDRESSES[CHAIN_IDS.celoSepolia].usdm;
}

export function normalizeWalletAddress(address: string): `0x${string}` {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error("Invalid wallet address.");
  }
  return address.toLowerCase() as `0x${string}`;
}
