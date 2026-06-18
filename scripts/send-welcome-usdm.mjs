#!/usr/bin/env node
/**
 * Send USDm directly to a wallet (welcome faucet / second phone).
 * Requires: PRIVATE_KEY in taskpay/.env
 * Usage: node scripts/send-welcome-usdm.mjs <recipient> [amount]
 * Example: pnpm fund:welcome 0xAB67... 0.5
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

const USDm = "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b";
const RPC = "https://forno.celo-sepolia.celo-testnet.org";
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)",
];

const recipient = process.argv[2];
const amountHuman = process.argv[3] ?? "0.5";

async function main() {
  if (!env.PRIVATE_KEY) {
    throw new Error("Set PRIVATE_KEY in taskpay/.env");
  }
  if (!recipient || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
    throw new Error("Usage: send-welcome-usdm.mjs <0xRecipient> [amount]");
  }

  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const signer = new ethers.Wallet(env.PRIVATE_KEY, provider);
  const usdm = new ethers.Contract(USDm, ERC20_ABI, signer);
  const amount = ethers.utils.parseUnits(amountHuman, 18);

  const bal = await usdm.balanceOf(signer.address);
  console.log(`Deployer ${signer.address}`);
  console.log(`USDm balance: ${ethers.utils.formatUnits(bal, 18)}`);
  if (bal.lt(amount)) {
    throw new Error(
      `Insufficient USDm. Run pnpm fund:swap first or send USDC to deployer.`
    );
  }

  const tx = await usdm.transfer(recipient, amount);
  console.log(`Sending ${amountHuman} USDm to ${recipient}`);
  console.log("Tx:", tx.hash);
  await tx.wait();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
