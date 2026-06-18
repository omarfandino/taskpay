"use client";

import { useState } from "react";
import {
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { erc20Abi } from "@/lib/taskpay-abi";
import { getExplorerUrl } from "@/lib/constants";
import { getUsdcAddress } from "@/lib/tx";
import { useMiniPay } from "@/hooks/useMiniPay";
import { Button } from "@/components/ui/button";

const DEPLOYER =
  (process.env.NEXT_PUBLIC_DEPLOYER_ADDRESS as `0x${string}`) ||
  "0xb0579E5ECC36266e4f9c7930E3F437eDCd143070";

const AMOUNT = "10";

export default function DevFundPage() {
  const { address, chainId, isMiniPay, mounted } = useMiniPay();
  const usdc = getUsdcAddress(chainId);
  const [hash, setHash] = useState<`0x${string}` | undefined>();

  const { data: balance } = useReadContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { writeContract, isPending, error } = useWriteContract({
    mutation: {
      onSuccess: (h) => setHash(h),
    },
  });

  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  if (!mounted) return null;

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <h1 className="text-xl font-semibold">Send test USDC</h1>
      <p className="text-sm text-muted-foreground">
        Dev helper: sends {AMOUNT} testnet USDC for TaskPay network fees via
        MiniPay fee abstraction. Not real money — testnet only.
      </p>

      {!isMiniPay && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Open this page inside MiniPay (Developer Settings → Open URL).
        </p>
      )}

      <div className="rounded-lg border p-4 text-sm space-y-1">
        <p>
          <span className="text-muted-foreground">Your wallet:</span>{" "}
          {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "…"}
        </p>
        <p>
          <span className="text-muted-foreground">USDC balance:</span>{" "}
          {balance !== undefined
            ? `${formatUnits(balance as bigint, 6)} USDC`
            : "…"}
        </p>
        <p>
          <span className="text-muted-foreground">Send to:</span>{" "}
          {DEPLOYER.slice(0, 6)}…{DEPLOYER.slice(-4)}
        </p>
      </div>

      <Button
        className="w-full"
        disabled={!address || isPending || confirming}
        onClick={() =>
          writeContract({
            address: usdc,
            abi: erc20Abi,
            functionName: "transfer",
            args: [DEPLOYER, parseUnits(AMOUNT, 6)],
          })
        }
      >
        {isPending
          ? "Confirm in MiniPay…"
          : confirming
            ? "Sending…"
            : `Send ${AMOUNT} USDC`}
      </Button>

      {error && (
        <p className="text-sm text-red-400">{error.message.split("\n")[0]}</p>
      )}
      {isSuccess && hash && chainId && (
        <p className="text-sm text-emerald-400">
          Sent!{" "}
          <a
            href={getExplorerUrl(chainId, hash)}
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            View tx
          </a>
        </p>
      )}
    </main>
  );
}
