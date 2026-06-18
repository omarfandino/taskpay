"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { WagmiProvider, useConnect, useAccount } from "wagmi";
import { CHAIN_IDS } from "@/lib/constants";
import { minipayConnector, wagmiConfig } from "@/lib/wagmi-config";

const queryClient = new QueryClient();

function WalletProviderInner({ children }: { children: React.ReactNode }) {
  const { connect } = useConnect();
  const { isConnected } = useAccount();

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.ethereum?.isMiniPay &&
      !isConnected
    ) {
      connect({
        connector: minipayConnector,
        chainId: CHAIN_IDS.celoSepolia,
      });
    }
  }, [connect, isConnected]);

  return <>{children}</>;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletProviderInner>{children}</WalletProviderInner>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
