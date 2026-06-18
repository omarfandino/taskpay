import { createConfig, http } from "wagmi";
import { celo, celoSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

/** MiniPay WebView (auto-connect). */
export const minipayConnector = injected({
  target: "metaMask",
});

/** MetaMask / browser extension (manual connect). */
export const browserConnector = injected({
  shimDisconnect: true,
});

export const wagmiConfig = createConfig({
  chains: [celoSepolia, celo],
  connectors: [minipayConnector, browserConnector],
  transports: {
    [celo.id]: http("https://forno.celo.org"),
    [celoSepolia.id]: http("https://forno.celo-sepolia.celo-testnet.org"),
  },
  ssr: true,
});
