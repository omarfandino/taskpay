"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEMO_STORAGE_MODE } from "@/lib/demo-config";
import { useMiniPay } from "@/hooks/useMiniPay";

type WelcomeStatus =
  | "idle"
  | "claiming"
  | "sent"
  | "already_claimed"
  | "error"
  | "skipped";

export function useWelcomeUsdc() {
  const { address, mounted } = useMiniPay();
  const [status, setStatus] = useState<WelcomeStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const claimedFor = useRef<string | null>(null);

  const claimWelcome = useCallback(async (wallet: string) => {
    setStatus("claiming");
    setMessage(null);

    try {
      const response = await fetch("/api/welcome-usdc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: wallet }),
      });

      const payload = (await response.json()) as {
        status?: string;
        error?: string;
        amount?: string;
      };

      if (!response.ok) {
        setStatus("error");
        setMessage(payload.error || "Could not send welcome USDC.");
        return;
      }

      if (payload.status === "already_claimed") {
        setStatus("already_claimed");
        return;
      }

      setStatus("sent");
      setMessage(
        `You received ${payload.amount ?? "1"} USDC to cover network fees.`
      );
    } catch {
      setStatus("error");
      setMessage("Welcome faucet unavailable. Try again later.");
    }
  }, []);

  useEffect(() => {
    if (!mounted || !address || DEMO_STORAGE_MODE) {
      setStatus("skipped");
      return;
    }

    const key = address.toLowerCase();
    if (claimedFor.current === key) return;
    claimedFor.current = key;

    void claimWelcome(address);
  }, [address, claimWelcome, mounted]);

  return {
    status,
    message,
    retry: address ? () => claimWelcome(address) : undefined,
  };
}
