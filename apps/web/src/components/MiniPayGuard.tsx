"use client";

import { useBalance, useReadContract } from "wagmi";
import { erc20Abi } from "@/lib/taskpay-abi";
import { getCopmAddress, getUsdcAddress } from "@/lib/tx";
import { useMiniPay } from "@/hooks/useMiniPay";
import { DEMO_STORAGE_MODE } from "@/lib/demo-config";
import { MINIPAY_DEPOSIT_URL } from "@/lib/constants";
import { hasBrowserNetworkFeeCoverage } from "@/lib/welcome-faucet";
import { useWelcomeUsdc } from "@/components/WelcomeUsdcProvider";

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
  /** `browse` = Feed / take tasks. `post` = Create (COPm reward + network fees). */
  mode?: "browse" | "post";
};

export function LowBalanceNotice({ mode = "post" }: LowBalanceNoticeProps) {
  const { address, chainId, isMiniPay } = useMiniPay();
  const { isWelcomeInProgress } = useWelcomeUsdc();

  if (DEMO_STORAGE_MODE || isWelcomeInProgress) return null;

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
    query: { enabled: Boolean(address && !isMiniPay) },
  });

  const { data: nativeBal } = useBalance({
    address,
    query: { enabled: Boolean(address && !isMiniPay) },
  });

  const lowCopm =
    mode === "post" &&
    copmBal !== undefined &&
    (copmBal as bigint) === 0n;

  const browserFeesLoaded =
    isMiniPay ||
    (nativeBal !== undefined && usdcBal !== undefined);
  const lowBrowserFees =
    !isMiniPay &&
    browserFeesLoaded &&
    !hasBrowserNetworkFeeCoverage(
      nativeBal?.value,
      usdcBal as bigint | undefined
    );

  if (!lowCopm && !lowBrowserFees) return null;

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
      {lowBrowserFees && (
        <p className={lowCopm ? "mt-2" : undefined}>
          Keep funds available for network fees.{" "}
          <a
            href="https://faucet.celo.org/celo-sepolia"
            className="font-bold text-primary underline transition-colors duration-200 hover:text-primary/80"
            target="_blank"
            rel="noopener noreferrer"
          >
            Celo Sepolia faucet
          </a>{" "}
          or ask an organizer.
        </p>
      )}
    </div>
  );
}
