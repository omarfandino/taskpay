"use client";

import { MINIPAY_FEE_TEST } from "@/lib/minipay-fee-test";

export function MinipayFeeTestBanner() {
  if (!MINIPAY_FEE_TEST) return null;

  return (
    <div className="border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-100">
      <strong>Fee test branch.</strong> No feeCurrency — MiniPay should deduct
      network fees from your USDC/USDm balance. Welcome faucet is off. Fund via{" "}
      <a
        href="https://faucet.circle.com/"
        className="font-semibold underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        Circle USDC
      </a>{" "}
      (Celo Sepolia).
    </div>
  );
}
