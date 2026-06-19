"use client";

import { useReadContract } from "wagmi";
import { erc20Abi } from "@/lib/taskpay-abi";
import { getCopmAddress, getUsdcAddress } from "@/lib/tx";
import { useMiniPay } from "@/hooks/useMiniPay";
import { DEMO_STORAGE_MODE } from "@/lib/demo-config";
import { MINIPAY_DEPOSIT_URL } from "@/lib/constants";
import { MIN_USDC_FOR_FEES } from "@/lib/welcome-faucet";

export function MiniPayBanner() {
  const { mounted, isMiniPay } = useMiniPay();

  if (!mounted || isMiniPay) return null;

  return (
    <div className="border-b border-border bg-muted px-4 py-2.5 text-center text-sm font-medium text-muted-foreground">
      Browser mode — connect MetaMask to post and take tasks.{" "}
      <a
        href="https://minipay.opera.com"
        className="font-bold text-primary underline transition-colors duration-200 hover:text-primary/80"
        target="_blank"
        rel="noopener noreferrer"
      >
        MiniPay
      </a>{" "}
      auto-connects on mobile.
    </div>
  );
}

type LowBalanceNoticeProps = {
  /** `browse` = Feed / take tasks (USDC fees only). `post` = Create (COPm reward + USDC fees). */
  mode?: "browse" | "post";
};

export function LowBalanceNotice({ mode = "post" }: LowBalanceNoticeProps) {
  const { address, chainId, isMiniPay } = useMiniPay();

  if (DEMO_STORAGE_MODE) return null;

  const copm = getCopmAddress(chainId);
  const usdc = getUsdcAddress(chainId);

  const { data: copmBal } = useReadContract({
    address: copm,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: usdcBal } = useReadContract({
    address: usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const lowCopm =
    mode === "post" &&
    copmBal !== undefined &&
    (copmBal as bigint) === 0n;
  const lowUsdc =
    usdcBal !== undefined && (usdcBal as bigint) < MIN_USDC_FOR_FEES;
  const noUsdc =
    usdcBal !== undefined && (usdcBal as bigint) === 0n;

  if (!lowCopm && !lowUsdc) return null;

  return (
    <div className="reward-chip mb-4 w-full flex-col items-start gap-1 p-4 text-sm text-foreground">
      {lowCopm && (
        <p>
          Posting needs <strong>COPm</strong> for the task reward (min 50 COPm).
          {isMiniPay ? (
            <>
              {" "}
              <a
                href={MINIPAY_DEPOSIT_URL}
                className="font-bold text-primary underline transition-colors duration-200 hover:text-primary/80"
              >
                Deposit
              </a>{" "}
              in MiniPay, then swap to COPm.
            </>
          ) : (
            <> Ask an organizer for test COPm.</>
          )}
        </p>
      )}
      {!isMiniPay && lowUsdc && (
        <p className={lowCopm ? "mt-2" : undefined}>
          {noUsdc ? (
            <>
              Keep some <strong>USDC</strong> for network fees.
              {mode === "browse" && !lowCopm && (
                <>
                  {" "}
                  New wallets get 1 USDC automatically — wait a few seconds
                  after connecting.
                </>
              )}
            </>
          ) : (
            <>
              Running low on <strong>USDC</strong> for network fees (~0.01 per
              action). Top up soon.
            </>
          )}{" "}
          {isMiniPay && (
            <>
              <a
                href={MINIPAY_DEPOSIT_URL}
                className="font-bold text-primary underline transition-colors duration-200 hover:text-primary/80"
              >
                Deposit
              </a>{" "}
              or{" "}
            </>
          )}
          <a
            href="https://faucet.circle.com/"
            className="font-bold text-primary underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Circle faucet
          </a>{" "}
          (Celo Sepolia).
        </p>
      )}
    </div>
  );
}
