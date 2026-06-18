"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnect, useAccount, useSwitchChain } from "wagmi";
import { CHAIN_IDS } from "@/lib/constants";
import { browserConnector, minipayConnector } from "@/lib/wagmi-config";

function detectMiniPay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    (window as Window & { ethereum?: { isMiniPay?: boolean } }).ethereum
      ?.isMiniPay === true
  );
}

export function useMiniPay() {
  const { connect, isPending: connectPending } = useConnect();
  const { switchChain } = useSwitchChain();
  const { address, isConnected, chainId, status } = useAccount();
  const [isMiniPay, setIsMiniPay] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setIsMiniPay(detectMiniPay());
  }, []);

  const connectWallet = useCallback(() => {
    setConnectError(null);
    const connector = detectMiniPay() ? minipayConnector : browserConnector;
    connect(
      { connector, chainId: CHAIN_IDS.celoSepolia },
      {
        onError: (err) => {
          setConnectError(err.message);
        },
      }
    );
  }, [connect]);

  useEffect(() => {
    if (!isConnected || chainId === CHAIN_IDS.celoSepolia || !switchChain) {
      return;
    }
    switchChain(
      { chainId: CHAIN_IDS.celoSepolia },
      {
        onError: (err) => {
          setConnectError(err.message);
        },
      }
    );
  }, [chainId, isConnected, switchChain]);

  const wrongChain =
    mounted && isConnected && chainId !== undefined && chainId !== CHAIN_IDS.celoSepolia;
  const needsConnect = mounted && !address && !connectPending;
  const isConnecting = mounted && connectPending;

  return {
    address,
    isConnected,
    isMiniPay,
    chainId,
    mounted,
    connectPending,
    connectError,
    walletStatus: status,
    connectWallet,
    needsConnect,
    isConnecting,
    wrongChain,
  };
}
