"use client";

import { useReadContract } from "wagmi";
import { Wallet, Sparkles } from "lucide-react";
import { erc20Abi } from "@/lib/taskpay-abi";
import { getCopmAddress, getUsdmAddress } from "@/lib/tx";
import { formatCopm } from "@/lib/constants";
import { useMiniPay } from "@/hooks/useMiniPay";
import { LogoMark } from "@/components/LogoMark";

export function HeaderBalance() {
  const { address, chainId, mounted, isMiniPay, isConnected } = useMiniPay();
  const copm = getCopmAddress(chainId);
  const usdm = getUsdmAddress(chainId);

  const { data: copmBalance } = useReadContract({
    address: copm,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: usdmBalance } = useReadContract({
    address: usdm,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  if (!mounted) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <LogoMark className="h-10 w-10 shrink-0" />
          <div className="min-w-0">
            <h1 className="font-heading text-lg font-extrabold tracking-tight text-foreground">
              TaskPay
            </h1>
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" aria-hidden />
              Earn digital pesos for real tasks
            </p>
          </div>
        </div>

        {address && isConnected ? (
          <div className="shrink-0 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Balance
            </p>
            <p className="font-heading text-lg font-extrabold text-primary">
              {copmBalance !== undefined
                ? formatCopm(copmBalance as bigint)
                : "…"}
              <span className="ml-1 text-xs font-bold text-foreground/70">
                COPm
              </span>
            </p>
            {!isMiniPay && usdmBalance !== undefined && (
              <p className="text-[10px] text-muted-foreground">
                {formatCopm(usdmBalance as bigint)} USDm network fees
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" />
            {isMiniPay ? "Connecting…" : "Open in MiniPay"}
          </div>
        )}
      </div>
    </header>
  );
}
