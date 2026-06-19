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
import { useBalance, useReadContract } from "wagmi";
import { erc20Abi } from "@/lib/taskpay-abi";
import { DEMO_STORAGE_MODE } from "@/lib/demo-config";
import { useMiniPay } from "@/hooks/useMiniPay";
import { getUsdcAddress } from "@/lib/tx";
import {
  WELCOME_CELO_AMOUNT,
  WELCOME_USDC_AMOUNT,
  type WelcomeClient,
} from "@/lib/welcome-faucet";

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
  /** Block feed/actions until welcome grant is confirmed on-chain. */
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
  const isMiniPayRef = useRef(isMiniPay);
  isMiniPayRef.current = isMiniPay;

  const usdc = getUsdcAddress(chainId);

  const waitingForGrantOnChain =
    mounted &&
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
      enabled: Boolean(address && !DEMO_STORAGE_MODE && isMiniPay),
      refetchInterval:
        waitingForGrantOnChain && isMiniPay ? 2000 : false,
    },
  });

  const { data: nativeBalance } = useBalance({
    address,
    query: {
      enabled: Boolean(address && !DEMO_STORAGE_MODE && !isMiniPay),
      refetchInterval:
        waitingForGrantOnChain && !isMiniPay ? 2000 : false,
    },
  });

  const hasFeeCoverage = isMiniPay
    ? usdcBalance !== undefined &&
      (usdcBalance as bigint) >= WELCOME_USDC_AMOUNT
    : nativeBalance !== undefined &&
      nativeBalance.value >= WELCOME_CELO_AMOUNT;

  const claimWelcome = useCallback(
    async (wallet: string) => {
      const client: WelcomeClient = isMiniPayRef.current
        ? "minipay"
        : "browser";

      setStatus("claiming");
      setMessage(null);
      setSetupTimedOut(false);

      try {
        const response = await fetch("/api/welcome-usdc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: wallet, client }),
        });

        const payload = (await response.json()) as {
          status?: string;
          error?: string;
          amount?: string;
        };

        if (!response.ok) {
          setStatus("error");
          setMessage(
            payload.error || "Could not add network fee coverage."
          );
          return;
        }

        if (payload.status === "already_claimed") {
          setStatus("already_claimed");
          await queryClient.invalidateQueries({ queryKey: ["readContract"] });
          await queryClient.invalidateQueries({ queryKey: ["balance"] });
          return;
        }

        setStatus("sent");
        setMessage(
          "Welcome reward added — network fees covered for your first tasks."
        );
        await queryClient.invalidateQueries({ queryKey: ["readContract"] });
        await queryClient.invalidateQueries({ queryKey: ["balance"] });
      } catch {
        setStatus("error");
        setMessage("Network fee setup unavailable. Try again later.");
      }
    },
    [queryClient]
  );

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

  useEffect(() => {
    if (status !== "sent" || hasFeeCoverage) {
      setSetupTimedOut(false);
      return;
    }

    const timer = window.setTimeout(
      () => setSetupTimedOut(true),
      SETUP_TIMEOUT_MS
    );
    return () => window.clearTimeout(timer);
  }, [status, hasFeeCoverage, address]);

  const isWalletSetupBlocking = useMemo(() => {
    if (!mounted || DEMO_STORAGE_MODE || !isConnected || !address) {
      return false;
    }
    if (status === "already_claimed" || status === "skipped") return false;
    if (status === "error") return true;
    if (status === "idle" || status === "claiming") return true;
    if (status === "sent") {
      if (hasFeeCoverage) return false;
      if (setupTimedOut) return false;
      return true;
    }
    return false;
  }, [
    address,
    hasFeeCoverage,
    isConnected,
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
