"use client";

import { useEffect, useState } from "react";
import { useConnect, useAccount } from "wagmi";
import { injected } from "wagmi/connectors";

export function useMiniPay() {
  const { connect } = useConnect();
  const { address, isConnected, chainId } = useAccount();
  const [isMiniPay, setIsMiniPay] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mp =
      typeof window !== "undefined" &&
      (window as Window & { ethereum?: { isMiniPay?: boolean } }).ethereum
        ?.isMiniPay === true;
    setIsMiniPay(mp);

    if (mp && !isConnected) {
      connect({ connector: injected() });
    }
  }, [isConnected, connect]);

  return {
    address,
    isConnected,
    isMiniPay,
    chainId,
    mounted,
  };
}
