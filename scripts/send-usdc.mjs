#!/usr/bin/env node
/**
 * Send USDC on Celo Sepolia from deployer (network fees for a wallet).
 * Requires: PRIVATE_KEY in taskpay/.env; MINIPAY_ADDRESS if no recipient arg.
 *
 * Usage: pnpm fund:usdc [amount] [0xRecipient]
 * Examples:
 *   pnpm fund:usdc 1                          → 1 USDC to MINIPAY_ADDRESS
 *   pnpm fund:usdc 1 0x1823CF07c8F0...        → 1 USDC to taker wallet
 *   pnpm fund:usdc 0x1823CF07c8F0... 1        → order does not matter
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

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function parseArgs(argv) {
  let amountHuman = "1";
  let recipient = null;

  for (const arg of argv.slice(2)) {
    if (ADDRESS_RE.test(arg)) {
      recipient = arg;
    } else if (/^\d+(\.\d+)?$/.test(arg)) {
      amountHuman = arg;
    } else {
      throw new Error(
        `Unknown argument "${arg}". Usage: fund:usdc [amount] [0xRecipient]`
      );
    }
  }

  recipient = recipient ?? env.MINIPAY_ADDRESS;
  if (!recipient) {
    throw new Error(
      "Pass a 0x recipient or set MINIPAY_ADDRESS in taskpay/.env for the default."
    );
  }
  if (!ADDRESS_RE.test(recipient)) {
    throw new Error(`Invalid recipient address: ${recipient}`);
  }

  return {
    recipient,
    amount: ethers.utils.parseUnits(amountHuman, 6),
    amountHuman,
  };
}

async function main() {
  if (!env.PRIVATE_KEY) {
    throw new Error("Set PRIVATE_KEY in taskpay/.env (deployer wallet).");
  }

  const { recipient, amount, amountHuman } = parseArgs(process.argv);

  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const signer = new ethers.Wallet(env.PRIVATE_KEY, provider);
  const usdc = new ethers.Contract(USDC, ERC20_ABI, signer);

  const bal = await usdc.balanceOf(signer.address);
  console.log(`From (deployer) ${signer.address}`);
  console.log(`To (recipient)  ${recipient}`);
  console.log(`USDC balance:    ${ethers.utils.formatUnits(bal, 6)}`);
  if (bal.lt(amount)) {
    throw new Error(
      `Need at least ${amountHuman} USDC on deployer. Fund via https://faucet.circle.com/ (Celo Sepolia).`
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
