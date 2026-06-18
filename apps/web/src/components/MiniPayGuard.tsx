"use client";

import { useReadContract } from "wagmi";
import { erc20Abi } from "@/lib/taskpay-abi";
import { getCopmAddress, getUsdcAddress, getUsdmAddress } from "@/lib/tx";
import { MINIPAY_FEE_TEST } from "@/lib/minipay-fee-test";
import { useMiniPay } from "@/hooks/useMiniPay";
import { DEMO_STORAGE_MODE } from "@/lib/demo-config";
import { MINIPAY_DEPOSIT_URL } from "@/lib/constants";

export function MiniPayBanner() {
  const { mounted, isMiniPay, isConnected } = useMiniPay();

  if (!mounted || isMiniPay) return null;

  return (
    <div className="border-b border-border bg-muted px-4 py-2.5 text-center text-sm font-medium text-muted-foreground">
      Open this app inside{" "}
      <a
        href="https://minipay.opera.com"
        className="font-bold text-primary underline transition-colors duration-200 hover:text-primary/80"
        target="_blank"
        rel="noopener noreferrer"
      >
        MiniPay
      </a>{" "}
      for the best experience.
      {!isConnected && (
        <> You can still browse tasks in your browser.</>
      )}
    </div>
  );
}

export function LowBalanceNotice() {
  const { address, chainId } = useMiniPay();

  if (DEMO_STORAGE_MODE) return null;

  const copm = getCopmAddress(chainId);
  const usdm = getUsdmAddress(chainId);
  const usdc = getUsdcAddress(chainId);
  const feeToken = MINIPAY_FEE_TEST ? usdc : usdm;

  const { data: copmBal } = useReadContract({
    address: copm,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: feeBal } = useReadContract({
    address: feeToken,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const lowCopm = copmBal !== undefined && (copmBal as bigint) === 0n;
  const lowFeeToken =
    feeBal !== undefined && (feeBal as bigint) < (MINIPAY_FEE_TEST ? 10n ** 6n : 10n ** 17n);

  if (!lowCopm && !lowFeeToken) return null;

  return (
    <div className="reward-chip mb-4 w-full flex-col items-start gap-1 p-4 text-sm text-foreground">
      {lowCopm && (
        <p>
          You need <strong>COPm</strong> stablecoins to post or take tasks.{" "}
          <a href={MINIPAY_DEPOSIT_URL} className="font-bold text-primary underline transition-colors duration-200 hover:text-primary/80">
            Deposit
          </a>{" "}
          in MiniPay, then swap to COPm.
        </p>
      )}
      {lowFeeToken && (
        <p className={lowCopm ? "mt-2" : undefined}>
          Keep some <strong>{MINIPAY_FEE_TEST ? "USDC" : "USDm"}</strong> for
          network fees.{" "}
          <a href={MINIPAY_DEPOSIT_URL} className="font-bold text-primary underline transition-colors duration-200 hover:text-primary/80">
            Deposit
          </a>{" "}
          {MINIPAY_FEE_TEST
            ? "or use the Circle faucet (Celo Sepolia)."
            : "to top up."}
        </p>
      )}
    </div>
  );
}
