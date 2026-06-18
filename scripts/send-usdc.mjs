#!/usr/bin/env node
/**
 * Send USDC on Celo Sepolia (gas money for a wallet).
 * Requires: PRIVATE_KEY in taskpay/.env (deployer with USDC + CELO for gas)
 *
 * Usage: pnpm fund:usdc <0xRecipient> [amount]
 * Example: pnpm fund:usdc 0xAB67... 1
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const USDC = "0x01C5C0122039549AD1493B8220cABEdD739BC44E";
const RPC = "https://forno.celo-sepolia.celo-testnet.org";
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)",
];

const recipient = process.argv[2];
const amountHuman = process.argv[3] ?? "1";

async function main() {
  if (!env.PRIVATE_KEY) {
    throw new Error("Set PRIVATE_KEY in taskpay/.env");
  }
  if (!recipient || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
    throw new Error("Usage: fund:usdc <0xRecipient> [amountUSDC]");
  }

  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const signer = new ethers.Wallet(env.PRIVATE_KEY, provider);
  const usdc = new ethers.Contract(USDC, ERC20_ABI, signer);
  const amount = ethers.utils.parseUnits(amountHuman, 6);

  const bal = await usdc.balanceOf(signer.address);
  console.log(`Deployer ${signer.address}`);
  console.log(`USDC balance: ${ethers.utils.formatUnits(bal, 6)}`);
  if (bal.lt(amount)) {
    throw new Error(
      "Insufficient USDC on deployer. Fund via https://faucet.circle.com/ (Celo Sepolia)."
    );
  }

  const tx = await usdc.transfer(recipient, amount);
  console.log(`Sending ${amountHuman} USDC to ${recipient}`);
  console.log("Tx:", tx.hash);
  await tx.wait();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
