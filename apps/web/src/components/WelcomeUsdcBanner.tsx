"use client";

import { useWelcomeUsdc } from "@/components/WelcomeUsdcProvider";
import { Button } from "@/components/ui/button";

/** Brief status after setup gate — success toast or error when gate timed out. */
export function WelcomeUsdcBanner() {
  const { status, message, retry, isWalletSetupBlocking, showSuccessBanner } =
    useWelcomeUsdc();

  if (isWalletSetupBlocking) return null;

  if (
    status === "idle" ||
    status === "skipped" ||
    status === "already_claimed" ||
    status === "claiming"
  ) {
    return null;
  }

  if (showSuccessBanner && message) {
    return (
      <div className="border-b border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-center text-sm text-emerald-300">
        {message}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-200">
        <span>{message}</span>
        {retry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg border-amber-500/40 text-xs"
            onClick={retry}
          >
            Try again
          </Button>
        )}
      </div>
    );
  }

  return null;
}
