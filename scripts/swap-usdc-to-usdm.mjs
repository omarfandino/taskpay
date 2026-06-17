#!/usr/bin/env node
/**
 * Swap USDC → USDm on Celo Sepolia via Mento SDK v3, then send USDm to MiniPay.
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { Mento, ChainId } from "@mento-protocol/mento-sdk";
import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  formatUnits,
  defineChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

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

const celoSepolia = defineChain({
  id: 11142220,
  name: "Celo Sepolia",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
});

const account = privateKeyToAccount(env.PRIVATE_KEY);
const publicClient = createPublicClient({ chain: celoSepolia, transport: http(RPC) });
const walletClient = createWalletClient({
  account,
  chain: celoSepolia,
  transport: http(RPC),
});

const usdcAmount = parseUnits(process.argv[2] ?? "10", 6);
const sendToMinipay = parseUnits(process.argv[3] ?? "8", 18);
const fee = { feeCurrency: USDC };

async function main() {
  const usdcBal = await publicClient.readContract({
    address: USDC,
    abi: [
      {
        name: "balanceOf",
        type: "function",
        inputs: [{ type: "address" }],
        outputs: [{ type: "uint256" }],
        stateMutability: "view",
      },
    ],
    functionName: "balanceOf",
    args: [account.address],
  });

  console.log(`Deployer ${account.address}`);
  console.log(`USDC balance: ${formatUnits(usdcBal, 6)}`);
  if (usdcBal < usdcAmount) {
    console.error(`Need at least ${formatUnits(usdcAmount, 6)} USDC`);
    process.exit(1);
  }

  const mento = await Mento.create(ChainId.CELO_SEPOLIA, RPC);
  const expectedOut = await mento.quotes.getAmountOut(USDC, USDm, usdcAmount);
  console.log(
    `Quote: ${formatUnits(usdcAmount, 6)} USDC → ~${formatUnits(expectedOut, 18)} USDm`,
  );

  const { approval, swap } = await mento.swap.buildSwapTransaction(
    USDC,
    USDm,
    usdcAmount,
    account.address,
    account.address,
    { slippageTolerance: 1, deadline: Math.floor(Date.now() / 1000) + 600 },
  );

  if (approval) {
    const hash = await walletClient.sendTransaction({ ...approval, ...fee });
    console.log("Approval tx:", hash);
    await publicClient.waitForTransactionReceipt({ hash });
  }

  const swapHash = await walletClient.sendTransaction({ ...swap.params, ...fee });
  console.log("Swap tx:", swapHash);
  await publicClient.waitForTransactionReceipt({ hash: swapHash });

  const usdmBal = await publicClient.readContract({
    address: USDm,
    abi: [
      {
        name: "balanceOf",
        type: "function",
        inputs: [{ type: "address" }],
        outputs: [{ type: "uint256" }],
        stateMutability: "view",
      },
    ],
    functionName: "balanceOf",
    args: [account.address],
  });
  console.log(`USDm after swap: ${formatUnits(usdmBal, 18)}`);

  const transferAmount = sendToMinipay > usdmBal ? usdmBal : sendToMinipay;
  const transferHash = await walletClient.writeContract({
    address: USDm,
    abi: [
      {
        name: "transfer",
        type: "function",
        inputs: [{ type: "address" }, { type: "uint256" }],
        outputs: [{ type: "bool" }],
        stateMutability: "nonpayable",
      },
    ],
    functionName: "transfer",
    args: [env.MINIPAY_ADDRESS, transferAmount],
    ...fee,
  });
  console.log(
    `Sent ${formatUnits(transferAmount, 18)} USDm to MiniPay ${env.MINIPAY_ADDRESS}`,
  );
  console.log("Transfer tx:", transferHash);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
