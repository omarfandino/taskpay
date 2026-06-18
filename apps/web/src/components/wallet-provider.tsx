"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { WagmiProvider, createConfig, http, useConnect, useAccount } from "wagmi";
import { celo, celoSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { CHAIN_IDS } from "@/lib/constants";

const minipayConnector = injected({ target: "metaMask" });

const wagmiConfig = createConfig({
  chains: [celoSepolia, celo],
  connectors: [minipayConnector],
  transports: {
    [celo.id]: http("https://forno.celo.org"),
    [celoSepolia.id]: http("https://forno.celo-sepolia.celo-testnet.org"),
  },
  ssr: true,
});

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
