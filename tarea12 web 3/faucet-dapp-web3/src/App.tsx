// faucet-dapp-web3/src/App.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  useAccount,
  useDisconnect,
  useSwitchChain,
  useSignMessage,
  useChainId,
} from "wagmi";
import { sepolia } from "wagmi/chains";
import { formatUnits } from "viem";
import toast, { Toaster } from "react-hot-toast";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SiweMessage } from "siwe";

import { CONTRACT_CONFIG, FAUCET_TOKEN_ADDRESS } from "./constants";
import { claimTokensApi, getProtectedStatus, getSiweMessage, signIn } from "./api/faucet.api";

// Definición de tipos para los datos del backend
interface FaucetStatus {
    hasClaimed: boolean;
    balance: string; // Ya formateado por el backend
    users: string[];
    faucetAmount: string; // String para JSON
    decimals: number;
}


function MonospaceText({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-xs break-all bg-gray-100 p-1 rounded-md">{children}</span>
}

// Componente auxiliar
function DataPoint({ label, value, status }: { label: string, value: React.ReactNode, status?: boolean }) {
  const color = status === true ? 'text-green-600' : status === false ? 'text-red-600' : 'text-gray-900';
  return (
    <p className="text-sm mb-2">
      <b className="text-gray-700 font-semibold">{label}:</b> <span className={color}>{value}</span>
    </p>
  )
}


export default function App() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { open } = useWeb3Modal();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();

  // 1. Estado de Sesión (JWT)
  const [token, setToken] = useState<string | null>(null);

  // 2. Fetch de datos protegidos (reemplaza useReadContract)
  const { 
    data: faucetData, 
    refetch: refetchFaucetData, 
    isFetching: isStatusFetching,
    isError: isStatusError
  } = useQuery<FaucetStatus>({
    queryKey: ['faucetStatus', address, token],
    queryFn: () => {
        if (!token) throw new Error("No token for protected status");
        return getProtectedStatus(token);
    },
    enabled: !!token && !!address && chainId === sepolia.id, // Habilitado si hay token y en Sepolia
    staleTime: 5000, // Refrescar cada 5 segundos
  });

  // 3. Mutación para reclamar tokens (reemplaza useWriteContract)
  const claimMutation = useMutation({
    mutationFn: () => {
        if (!token) throw new Error("No token for claim");
        return claimTokensApi(token);
    },
    onSuccess: (txHash) => {
        toast.success(`✅ ¡Tokens reclamados! TX: ${txHash.slice(0, 10)}...`, { id: "claimTx" });
        refetchFaucetData(); // Refresca el estado después del reclamo
    },
    onError: (error) => {
        toast.error(`❌ Error al reclamar: ${error.message}`, { id: "claimTx" });
    },
    onMutate: () => {
        toast.loading("🔗 Enviando reclamo al backend...", { id: "claimTx" });
    }
  });

  // 4. Lógica de inicio de sesión (Sign-In with Ethereum - SIWE)
  const handleSignIn = useCallback(async () => {
    if (!address) return;
    try {
        const messageToSign = await getSiweMessage(address);
        
        const signature = await signMessageAsync({ message: messageToSign });

        // Parsear el mensaje para enviarlo al backend para la verificación
        const siweMessage = new SiweMessage(messageToSign);
        const { token: newToken } = await signIn(siweMessage, signature);
        
        setToken(newToken);
        toast.success("🔑 Autenticación exitosa (SIWE)", { id: "siwe" });

    } catch (error: any) {
        toast.error(`❌ Falló la autenticación: ${error?.shortMessage || error.message || 'Error desconocido'}`, { id: "siwe" });
        // Si falla la firma, desconectamos para forzar el reintento
        setToken(null);
        disconnect();
    }
  }, [address, disconnect, signMessageAsync]);

  // 5. useEffect para forzar el SIWE cuando la wallet se conecta y está en Sepolia
  useEffect(() => {
    if (isConnected && address && chainId === sepolia.id && !token && !isSigning) {
        handleSignIn();
    }
    if (!isConnected || chainId !== sepolia.id) {
        setToken(null); // Limpiar sesión si se desconecta o cambia de red
    }
  }, [isConnected, address, token, chainId, handleSignIn, isSigning]);


  const isAuthenticating = isSigning || (isConnected && !token && chainId === sepolia.id);
  const isAuthenticated = !!token && isConnected && chainId === sepolia.id;

  const faucetAmountFormatted = faucetData ? formatUnits(BigInt(faucetData.faucetAmount), faucetData.decimals) : '—';
  const isProcessing = claimMutation.isPending;
  const canClaim = isAuthenticated && !faucetData?.hasClaimed && !isProcessing;

  const handleClaim = () => {
    if (canClaim) {
        claimMutation.mutate();
    }
  };


  return (
    <div className="p-4 md:p-8">
      <Toaster position="top-right" />
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 mb-6 bg-white shadow-lg rounded-xl">
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-extrabold text-pink-600">Faucet Token dApp (Backend)</h1>
          <p className="text-sm text-gray-500">Autenticación con Sign-In with Ethereum (SIWE)</p>
        </div>
        <div>
            {isAuthenticated ? (
                <button 
                    className="px-4 py-2 text-white bg-red-500 rounded-lg shadow-md hover:bg-red-600 transition duration-150"
                    onClick={() => { setToken(null); disconnect(); }}
                >
                    Desconectar ({address?.slice(0, 6)}...)
                </button>
            ) : isConnected && chainId !== sepolia.id ? (
                <button 
                    className="px-4 py-2 text-pink-700 bg-pink-100 rounded-lg border border-pink-300 hover:bg-pink-200 transition duration-150" 
                    disabled={switching} 
                    onClick={() => switchChain({ chainId: sepolia.id })}
                >
                    {switching ? "Cambiando..." : "Cambiar a Sepolia"}
                </button>
            ) : (
                <button 
                    className="px-5 py-2 text-white bg-pink-600 rounded-lg shadow-md hover:bg-pink-700 transition duration-150" 
                    onClick={() => open()}
                >
                    Conectar Wallet
                </button>
            )}
        </div>
      </header>
      
      {/* MAIN CONTENT GRID */}
      <main className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* Wallet & Auth Status */}
        <section className="p-6 bg-white shadow-xl rounded-xl">
          <h2 className="mb-4 text-xl font-bold text-pink-600">Estado de la Sesión</h2>
          <DataPoint label="Wallet Conectada" value={isConnected ? "Sí" : "No"} status={isConnected} />
          <DataPoint label="Red" value={chainId === sepolia.id ? 'Sepolia' : chainId ? `ID ${chainId}` : '—'} status={chainId === sepolia.id} />
          <DataPoint 
            label="Autenticado (SIWE)" 
            value={isAuthenticating ? "Firmando..." : isAuthenticated ? "Sí (JWT)" : "No"} 
            status={isAuthenticated} 
          />
          <div className="mt-3">
            <p className="text-sm font-semibold text-gray-700 mb-1">Dirección:</p>
            {address ? <MonospaceText>{address}</MonospaceText> : <p className="text-gray-500">—</p>}
          </div>
        </section>

        {/* Token Info & Balance */}
        <section className="p-6 bg-white shadow-xl rounded-xl">
          <h2 className="mb-4 text-xl font-bold text-pink-600">Información y Saldo</h2>
          {isStatusFetching && isAuthenticated ? (
             <p className="text-gray-500">Cargando datos del Faucet...</p>
          ) : isStatusError ? (
             <p className="text-red-500">Error al cargar datos. ¿Sesión expirada?</p>
          ) : (
            <>
              <DataPoint label="Monto por Reclamo" value={`${faucetAmountFormatted} Tokens`} />
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-sm font-semibold text-gray-700">Tu Balance:</p>
                <p className="text-lg font-extrabold text-pink-500">
                  {isAuthenticated && faucetData ? `${faucetData.balance} Tokens` : "—"}
                </p>
              </div>
            </>
          )}
        </section>

        {/* Claim Faucet */}
        <section className="p-6 bg-white shadow-xl rounded-xl">
          <h2 className="mb-4 text-xl font-bold text-pink-600">Reclamar Tokens</h2>
          <DataPoint label="¿Ya reclamaste?" value={
            isAuthenticated && faucetData
            ? (faucetData.hasClaimed ? <span className="text-sm font-semibold text-green-700">Sí ✅</span> : <span className="text-sm font-semibold text-red-700">No 🛑</span>)
            : "—"
          } status={isAuthenticated && faucetData ? faucetData.hasClaimed : undefined} />
          
          <button 
            className={`w-full mt-6 px-5 py-3 font-bold text-white rounded-lg transition duration-150 ${
              canClaim 
              ? 'bg-pink-600 shadow-lg hover:bg-pink-700' 
              : 'bg-gray-400 cursor-not-allowed'
            }`}
            onClick={handleClaim} 
            disabled={!canClaim || isProcessing || isAuthenticating}
          >
            {isProcessing ? "Procesando Transacción..." : isAuthenticating ? "Esperando autenticación..." : "Reclamar 1M Faucet Tokens"}
          </button>
          
          <p className="mt-3 text-xs text-gray-500">
            • Requiere autenticación SIWE. • El backend paga el gas.
          </p>
        </section>
        
        {/* Faucet Users List (Full Width) */}
        <section className="lg:col-span-3 p-6 bg-white shadow-xl rounded-xl">
          <h2 className="mb-4 text-xl font-bold text-pink-600">Direcciones que ya reclamaron ({faucetData?.users.length ?? 0})</h2>
          <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {faucetData && faucetData.users.length > 0 ? (
              (faucetData.users as string[]).map((addr, index) => (
                <li key={addr} className="flex items-center justify-between py-2.5 px-2 hover:bg-pink-50 transition duration-100 rounded-md">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 font-mono text-xs">#{index + 1}</span>
                    <MonospaceText>{addr}</MonospaceText>
                  </div>
                  <button 
                    className="text-xs text-pink-600 hover:text-pink-800 transition"
                    onClick={() => { navigator.clipboard.writeText(addr); toast.success("Dirección copiada") }}
                  >
                    Copiar
                  </button>
                </li>
              ))
            ) : (
              <li className="text-center py-4 text-gray-500">Aún no hay usuarios o no estás autenticado para ver la lista.</li>
            )}
          </ul>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
        Contrato: <MonospaceText>{FAUCET_TOKEN_ADDRESS}</MonospaceText>
      </footer>
    </div>
  );
}