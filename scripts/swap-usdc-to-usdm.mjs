#!/usr/bin/env node
/**
 * Swap USDC → USDm on Celo Sepolia via Mento SDK, then send USDm to MiniPay.
 * Requires: PRIVATE_KEY, MINIPAY_ADDRESS in taskpay/.env
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
    }),
);

const USDC = "0x01C5C0122039549AD1493B8220cABEdD739BC44E";
const USDm = "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b";
const RPC = "https://forno.celo-sepolia.celo-testnet.org";
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function transfer(address,uint256) returns (bool)",
];

const usdcAmount = ethers.utils.parseUnits(process.argv[2] ?? "9", 6);
const sendToMinipay = ethers.utils.parseUnits(process.argv[3] ?? "8", 18);

async function main() {
  if (!env.PRIVATE_KEY || !env.MINIPAY_ADDRESS) {
    throw new Error("Set PRIVATE_KEY and MINIPAY_ADDRESS in taskpay/.env");
  }

  const provider = new ethers.providers.JsonRpcProvider(RPC);
  const signer = new ethers.Wallet(env.PRIVATE_KEY, provider);
  const usdc = new ethers.Contract(USDC, ERC20_ABI, signer);
  const usdm = new ethers.Contract(USDm, ERC20_ABI, signer);
  const mento = await Mento.create(signer);

  const usdcBal = await usdc.balanceOf(signer.address);
  console.log(`Deployer ${signer.address}`);
  console.log(`USDC balance: ${ethers.utils.formatUnits(usdcBal, 6)}`);
  if (usdcBal.lt(usdcAmount)) {
    throw new Error(`Need at least ${ethers.utils.formatUnits(usdcAmount, 6)} USDC`);
  }

  const expectedOut = await mento.getAmountOut(USDC, USDm, usdcAmount);
  const amountOutMin = expectedOut.mul(99).div(100);
  console.log(
    `Quote: ${ethers.utils.formatUnits(usdcAmount, 6)} USDC → ~${ethers.utils.formatUnits(expectedOut, 18)} USDm`,
  );

  const broker = await mento.getBroker();
  const allowance = await usdc.allowance(signer.address, broker.address);
  if (allowance.lt(usdcAmount)) {
    const approveTx = await usdc.approve(broker.address, usdcAmount);
    console.log("Approval tx:", approveTx.hash);
    await approveTx.wait();
  }

  const swapReq = await mento.swapIn(USDC, USDm, usdcAmount, amountOutMin);
  const swapTx = await signer.sendTransaction(swapReq);
  console.log("Swap tx:", swapTx.hash);
  await swapTx.wait();

  const usdmBal = await usdm.balanceOf(signer.address);
  console.log(`USDm after swap: ${ethers.utils.formatUnits(usdmBal, 18)}`);

  const transferAmount = sendToMinipay.gt(usdmBal) ? usdmBal : sendToMinipay;
  const transferTx = await usdm.transfer(env.MINIPAY_ADDRESS, transferAmount);
  console.log(
    `Sent ${ethers.utils.formatUnits(transferAmount, 18)} USDm to MiniPay ${env.MINIPAY_ADDRESS}`,
  );
  console.log("Transfer tx:", transferTx.hash);
  await transferTx.wait();
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
