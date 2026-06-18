"use client";

import { useEffect, useState } from "react";
import { useConnect, useAccount, useSwitchChain } from "wagmi";
import { injected } from "wagmi/connectors";
import { CHAIN_IDS } from "@/lib/constants";

const minipayConnector = injected({ target: "metaMask" });

export function useMiniPay() {
  const { connect, isPending: connectPending } = useConnect();
  const { switchChain } = useSwitchChain();
  const { address, isConnected, chainId, status } = useAccount();
  const [isMiniPay, setIsMiniPay] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const mp =
      typeof window !== "undefined" &&
      (window as Window & { ethereum?: { isMiniPay?: boolean } }).ethereum
        ?.isMiniPay === true;
    setIsMiniPay(mp);

    if (!mp || isConnected) return;

    connect(
      { connector: minipayConnector, chainId: CHAIN_IDS.celoSepolia },
      {
        onError: (err) => {
          setConnectError(err.message);
        },
      }
    );
  }, [isConnected, connect]);

  useEffect(() => {
    if (
      !isMiniPay ||
      !isConnected ||
      chainId === CHAIN_IDS.celoSepolia ||
      !switchChain
    ) {
      return;
    }
    switchChain({ chainId: CHAIN_IDS.celoSepolia });
  }, [chainId, isConnected, isMiniPay, switchChain]);

  return {
    address,
    isConnected,
    isMiniPay,
    chainId,
    mounted,
    connectPending,
    connectError,
    walletStatus: status,
  };
}
