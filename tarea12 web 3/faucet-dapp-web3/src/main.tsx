// faucet-dapp-web3/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css"; // Importa los estilos de Tailwind

import { createWeb3Modal } from "@web3modal/wagmi/react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const projectId = "d45b80401c803badcb78b48718eda6c5"; 
if (projectId === "d45b80401c803badcb78b48718eda6c5") {
  console.error("d45b80401c803badcb78b48718eda6c5");
}

const metadata = {
  name: "Faucet Token dApp",
  description: "Aplicación Web3 en React, Wagmi y Viem para interactuar con FaucetToken.",
  url: "https://localhost:5173",
  icons: ["https://avatars.githubusercontent.com/u/37784886"]
};

// 1. Configuración de Wagmi: Redes y Conectores
const wagmiConfig = createConfig({
  chains: [sepolia], // Usamos Sepolia Testnet
  transports: {
    [sepolia.id]: http("https://ethereum-sepolia-rpc.publicnode.com"), // RPC recomendado en el enunciado
  },
  connectors: [
    injected({ shimDisconnect: true }),
    walletConnect({ projectId, showQrModal: false, metadata }),
    coinbaseWallet({ appName: metadata.name })
  ],
});

// 2. Creación de Web3Modal
createWeb3Modal({
  wagmiConfig,
  projectId,
  metadata,
  themeVariables: { // Pequeña personalización visual
    '--w3m-accent': '#e21f79', 
    '--w3m-color-mix': '#e21f79',
    '--w3m-font-family': 'system-ui, sans-serif'
  }
});

// 3. Cliente de React Query (Usado por Wagmi)
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <App />
      </WagmiProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);