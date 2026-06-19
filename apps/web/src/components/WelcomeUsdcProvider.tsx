"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useReadContract } from "wagmi";
import { erc20Abi } from "@/lib/taskpay-abi";
import { DEMO_STORAGE_MODE } from "@/lib/demo-config";
import { useMiniPay } from "@/hooks/useMiniPay";
import { getUsdcAddress } from "@/lib/tx";
import { WELCOME_USDC_AMOUNT } from "@/lib/welcome-faucet";

export type WelcomeStatus =
  | "idle"
  | "claiming"
  | "sent"
  | "already_claimed"
  | "error"
  | "skipped";

type WelcomeUsdcContextValue = {
  status: WelcomeStatus;
  message: string | null;
  retry: (() => void) | undefined;
  /** Block feed/actions until welcome USDC is confirmed on-chain (MiniPay new wallets). */
  isWalletSetupBlocking: boolean;
};

const WelcomeUsdcContext = createContext<WelcomeUsdcContextValue | null>(null);

const SETUP_TIMEOUT_MS = 45_000;

export function WelcomeUsdcProvider({ children }: { children: ReactNode }) {
  const { address, chainId, mounted, isMiniPay, isConnected } = useMiniPay();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<WelcomeStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [setupTimedOut, setSetupTimedOut] = useState(false);
  const claimedFor = useRef<string | null>(null);

  const usdc = getUsdcAddress(chainId);

  const waitingForUsdcOnChain =
    mounted &&
    isMiniPay &&
    isConnected &&
    Boolean(address) &&
    !DEMO_STORAGE_MODE &&
    status === "sent";

  const { data: usdcBalance } = useReadContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address && !DEMO_STORAGE_MODE),
      refetchInterval: waitingForUsdcOnChain ? 2000 : false,
    },
  });

  const hasUsdcForFees =
    usdcBalance !== undefined &&
    (usdcBalance as bigint) >= WELCOME_USDC_AMOUNT;

  const claimWelcome = useCallback(
    async (wallet: string) => {
      setStatus("claiming");
      setMessage(null);
      setSetupTimedOut(false);

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
          await queryClient.invalidateQueries({ queryKey: ["readContract"] });
          return;
        }

        setStatus("sent");
        setMessage(
          `You received ${payload.amount ?? "1"} USDC to cover network fees.`
        );
        await queryClient.invalidateQueries({ queryKey: ["readContract"] });
      } catch {
        setStatus("error");
        setMessage("Welcome faucet unavailable. Try again later.");
      }
    },
    [queryClient]
  );

  useEffect(() => {
    if (!mounted || !address || DEMO_STORAGE_MODE) {
      setStatus("skipped");
      return;
    }

    if (!isMiniPay) {
      setStatus("skipped");
      return;
    }

    const key = address.toLowerCase();
    if (claimedFor.current === key) return;
    claimedFor.current = key;

    void claimWelcome(address);
  }, [address, claimWelcome, isMiniPay, mounted]);

  useEffect(() => {
    if (status !== "sent" || hasUsdcForFees) {
      setSetupTimedOut(false);
      return;
    }

    const timer = window.setTimeout(
      () => setSetupTimedOut(true),
      SETUP_TIMEOUT_MS
    );
    return () => window.clearTimeout(timer);
  }, [status, hasUsdcForFees, address]);

  const isWalletSetupBlocking = useMemo(() => {
    if (!mounted || DEMO_STORAGE_MODE || !isMiniPay || !isConnected || !address) {
      return false;
    }
    if (status === "already_claimed" || status === "skipped") return false;
    if (status === "error") return true;
    if (status === "idle" || status === "claiming") return true;
    if (status === "sent") {
      if (hasUsdcForFees) return false;
      if (setupTimedOut) return false;
      return true;
    }
    return false;
  }, [
    address,
    hasUsdcForFees,
    isConnected,
    isMiniPay,
    mounted,
    setupTimedOut,
    status,
  ]);

  const value = useMemo(
    () => ({
      status,
      message,
      retry: address ? () => claimWelcome(address) : undefined,
      isWalletSetupBlocking,
    }),
    [address, claimWelcome, isWalletSetupBlocking, message, status]
  );

  return (
    <WelcomeUsdcContext.Provider value={value}>
      {children}
    </WelcomeUsdcContext.Provider>
  );
}

export function useWelcomeUsdc() {
  const ctx = useContext(WelcomeUsdcContext);
  if (!ctx) {
    throw new Error("useWelcomeUsdc must be used within WelcomeUsdcProvider");
  }
  return ctx;
}
