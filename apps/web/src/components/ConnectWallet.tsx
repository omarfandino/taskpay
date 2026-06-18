"use client";

import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMiniPay } from "@/hooks/useMiniPay";

type ConnectWalletProps = {
  className?: string;
  label?: string;
};

export function ConnectWalletButton({
  className,
  label = "Connect wallet",
}: ConnectWalletProps) {
  const { connectWallet, connectPending } = useMiniPay();

  return (
    <Button
      type="button"
      className={className ?? "h-12 w-full gap-2 rounded-2xl text-base font-bold shadow-glow"}
      disabled={connectPending}
      onClick={() => connectWallet()}
    >
      <Wallet className="h-5 w-5" />
      {connectPending ? "Connecting…" : label}
    </Button>
  );
}

type ConnectWalletPromptProps = {
  title?: string;
  description?: string;
};

export function ConnectWalletPrompt({
  title = "Connect your wallet",
  description = "Sign in with MetaMask on Celo Sepolia to post tasks, take jobs, and get paid in COPm.",
}: ConnectWalletPromptProps) {
  const { connectError, isMiniPay, isConnecting, wrongChain } = useMiniPay();

  return (
    <div className="block-card space-y-4 p-5 text-center">
      <p className="font-heading text-lg font-bold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      {isConnecting && isMiniPay && (
        <p className="text-sm text-primary">Connecting MiniPay wallet…</p>
      )}
      {wrongChain && (
        <p className="text-sm text-amber-300">
          Switch your wallet to <strong>Celo Sepolia</strong> testnet.
        </p>
      )}
      {connectError && (
        <p className="text-sm text-red-400">{connectError}</p>
      )}
      {!isMiniPay && <ConnectWalletButton />}
    </div>
  );
}
