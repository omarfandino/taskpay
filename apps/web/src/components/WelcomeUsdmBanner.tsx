"use client";

import { useWelcomeUsdm } from "@/hooks/useWelcomeUsdm";
import { Button } from "@/components/ui/button";

export function WelcomeUsdmBanner() {
  const { status, message, retry } = useWelcomeUsdm();

  if (status === "idle" || status === "skipped" || status === "already_claimed") {
    return null;
  }

  if (status === "claiming") {
    return (
      <div className="border-b border-primary/20 bg-primary/10 px-4 py-2 text-center text-sm text-foreground">
        Sending welcome USDm for network fees…
      </div>
    );
  }

  if (status === "sent" && message) {
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
            Get test funds
          </Button>
        )}
      </div>
    );
  }

  return null;
}
