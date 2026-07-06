// Reown AppKit + wagmi wallet layer (Sepolia).
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { sepolia } from "@reown/appkit/networks";
import { http } from "wagmi";

export const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || "REOWN_PROJECT_ID";
const rpc = import.meta.env.VITE_SEPOLIA_RPC_URL;

export const networks = [sepolia];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
  transports: rpc ? { [sepolia.id]: http(rpc) } : undefined,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  defaultNetwork: sepolia,
  metadata: {
    name: "Vellum",
    description: "Confidential token distribution on the Zama Protocol",
    url: typeof window !== "undefined" ? window.location.origin : "https://vellum.app",
    icons: ["https://avatars.githubusercontent.com/u/37784886"],
  },
  features: { analytics: false, email: false, socials: [] },
  themeMode: "light",
  themeVariables: {
    "--w3m-accent": "#9A7A33",
    "--w3m-font-family": "'Hanken Grotesk', system-ui, sans-serif",
    "--w3m-border-radius-master": "2px",
  },
});