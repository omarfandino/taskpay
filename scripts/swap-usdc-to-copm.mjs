#!/usr/bin/env node
/**
 * Swap USDC → COPm on Celo Sepolia via Mento (deployer wallet), then send COPm to a recipient.
 * Requires: PRIVATE_KEY in taskpay/.env; MINIPAY_ADDRESS if no recipient arg.
 *
 * Prereqs on deployer:
 * - USDC (Circle faucet → deployer address)
 * - CELO for gas (faucet.celo.org/celo-sepolia)
 *
 * Usage: pnpm fund:copm [usdcAmount] [0xRecipient]
 * Examples:
 *   pnpm fund:copm 5                        → 5 USDC worth of COPm to MINIPAY_ADDRESS
 *   pnpm fund:copm 5 0x1823CF07c8F0...      → same, to taker wallet
 *   pnpm fund:copm 0x1823CF07c8F0... 5      → order does not matter
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";
import { Mento } from "@mento-protocol/mento-sdk";

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
const COPm = "0x5F8d55c3627d2dc0a2B4afa798f877242F382F67";
const RPC = "https://forno.celo-sepolia.celo-testnet.org";
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function transfer(address,uint256) returns (bool)",
];

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function parseArgs(argv) {
  let usdcAmountHuman = "5";
  let recipient = null;

  for (const arg of argv.slice(2)) {
    if (ADDRESS_RE.test(arg)) {
      recipient = arg;
    } else if (/^\d+(\.\d+)?$/.test(arg)) {
      usdcAmountHuman = arg;
    } else {
      throw new Error(
        `Unknown argument "${arg}". Usage: fund:copm [usdcAmount] [0xRecipient]`
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
    usdcAmount: ethers.utils.parseUnits(usdcAmountHuman, 6),
    usdcAmountHuman,
  };
}

async function main() {
  if (!env.PRIVATE_KEY) {
    throw new Error("Set PRIVATE_KEY in taskpay/.env (deployer wallet).");
  }

  const { recipient, usdcAmount, usdcAmountHuman } = parseArgs(process.argv);

  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const signer = new ethers.Wallet(env.PRIVATE_KEY, provider);
  const usdc = new ethers.Contract(USDC, ERC20_ABI, signer);
  const copm = new ethers.Contract(COPm, ERC20_ABI, signer);
  const mento = await Mento.create(signer);

  const usdcBal = await usdc.balanceOf(signer.address);
  console.log(`From (deployer) ${signer.address}`);
  console.log(`To (recipient)  ${recipient}`);
  console.log(`USDC balance:    ${ethers.utils.formatUnits(usdcBal, 6)}`);
  if (usdcBal.lt(usdcAmount)) {
    throw new Error(
      `Need at least ${usdcAmountHuman} USDC on deployer. Use https://faucet.circle.com/ (Celo Sepolia).`
    );
  }

  const expectedOut = await mento.getAmountOut(USDC, COPm, usdcAmount);
  const amountOutMin = expectedOut.mul(99).div(100);
  console.log(
    `Quote: ${usdcAmountHuman} USDC → ~${ethers.utils.formatUnits(expectedOut, 18)} COPm`
  );

  // USDC → COPm on Sepolia is often a 2-hop route (USDC → USDm → COPm) via MentoRouter,
  // not the Broker. Approve both before swapIn (which estimates gas during populateTransaction).
  const spenders = [...new Set([mento.router.address, mento.broker.address])];
  for (const spender of spenders) {
    const allowance = await usdc.allowance(signer.address, spender);
    if (allowance.lt(usdcAmount)) {
      const approveTx = await usdc.approve(spender, ethers.constants.MaxUint256);
      console.log(`Approval tx (${spender}):`, approveTx.hash);
      await approveTx.wait();
    }
  }

  const copmBefore = await copm.balanceOf(signer.address);

  const swapReq = await mento.swapIn(USDC, COPm, usdcAmount, amountOutMin);
  console.log(`Swap via ${swapReq.to}`);

  const swapTx = await signer.sendTransaction(swapReq);
  console.log("Swap tx:", swapTx.hash);
  await swapTx.wait();

  const copmAfter = await copm.balanceOf(signer.address);
  const received = copmAfter.sub(copmBefore);
  if (received.lte(0)) {
    throw new Error("Swap did not increase COPm balance.");
  }

  console.log(`COPm received: ${ethers.utils.formatUnits(received, 18)}`);

  const transferTx = await copm.transfer(recipient, received);
  console.log(
    `Sent ${ethers.utils.formatUnits(received, 18)} COPm to ${recipient}`
  );
  console.log("Transfer tx:", transferTx.hash);
  await transferTx.wait();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
