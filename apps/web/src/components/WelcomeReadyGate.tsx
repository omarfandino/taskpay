"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWelcomeUsdc } from "@/components/WelcomeUsdcProvider";

function SetupSkeleton() {
  return (
    <div className="space-y-4 px-4 pt-5">
      <div className="skeleton h-36 rounded-2xl" />
      <div className="skeleton h-44 rounded-2xl" />
      <div className="skeleton h-44 rounded-2xl" />
    </div>
  );
}

export function WelcomeReadyGate({ children }: { children: React.ReactNode }) {
  const { isWalletSetupBlocking, status, message, retry } = useWelcomeUsdc();

  if (!isWalletSetupBlocking) {
    return children;
  }

  const isError = status === "error";
  const waitingOnChain = status === "sent";

  let title = "Setting up your wallet…";
  let description =
    "We send 1 USDC for network fees. Please wait — do not take tasks yet.";

  if (status === "claiming") {
    description = "Sending 1 USDC to your wallet for network fees…";
  } else if (waitingOnChain) {
    title = "Almost ready…";
    description =
      "Waiting for USDC to arrive on-chain. This usually takes a few seconds.";
  } else if (isError) {
    title = "Could not set up network fees";
    description =
      message ??
      "Welcome USDC could not be sent. Try again before taking tasks.";
  }

  return (
    <div className="mx-auto max-w-lg pb-28">
      <div className="px-4 pt-6">
        <div className="mb-6 rounded-2xl border border-primary/25 bg-primary/10 p-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
            <Sparkles
              className={`h-6 w-6 text-primary ${!isError ? "animate-pulse" : ""}`}
              aria-hidden
            />
          </div>
          <h2 className="font-heading text-lg font-extrabold text-foreground">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
          {isError && retry && (
            <Button
              type="button"
              className="mt-4 h-11 rounded-xl font-bold shadow-glow"
              onClick={retry}
            >
              Try again
            </Button>
          )}
        </div>
      </div>
      {!isError && <SetupSkeleton />}
    </div>
  );
}
