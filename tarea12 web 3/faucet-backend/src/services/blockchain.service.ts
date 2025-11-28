// faucet-backend/src/services/blockchain.service.ts
import { 
  createWalletClient, 
  createPublicClient, 
  http, 
  Hex, 
  Address, 
  getContract,
  zeroAddress,
  formatUnits // Usar formatUnits de viem
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

// ABI del Contrato (solo funciones necesarias)
const FAUCET_TOKEN_ABI = [
    { type: 'function', stateMutability: 'nonpayable', name: 'claimTokens', inputs: [], outputs: [] },
    { type: 'function', stateMutability: 'view', name: 'hasAddressClaimed', inputs: [{ type: 'address', name: 'account' }], outputs: [{ type: 'bool', name: '' }] },
    { type: 'function', stateMutability: 'view', name: 'balanceOf', inputs:[{type:'address',name:'account'}], outputs:[{type:'uint256',name:''}] },
    { type: 'function', stateMutability: 'view', name: 'getFaucetUsers', inputs: [], outputs:[{type:'address[]',name:''}] },
    { type: 'function', stateMutability: 'view', name: 'getFaucetAmount', inputs: [], outputs:[{type:'uint256',name:''}] },
    { type: 'function', stateMutability: 'view', name: 'decimals', inputs: [], outputs:[{type:'uint8',name:''}] },
] as const;

// Configuración de Viem
const RPC_URL = process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as Address;
const FAUCET_PRIVATE_KEY = process.env.PRIVATE_KEY as Hex;

// Cliente Público (para lecturas de datos)
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL),
});

// Cliente Wallet (para firmar y enviar transacciones)
const faucetAccount = privateKeyToAccount(FAUCET_PRIVATE_KEY);
const walletClient = createWalletClient({
    account: faucetAccount,
    chain: sepolia,
    transport: http(RPC_URL),
});

// Configuración base del contrato para usar en multicall/simulate
const CONTRACT_CONFIG = {
    address: CONTRACT_ADDRESS,
    abi: FAUCET_TOKEN_ABI,
} as const;


/**
 * Ejecuta la transacción claimTokens en nombre del Faucet (backend).
 * @param userAddress La dirección del usuario autenticado (se usa solo para referencia, el contrato es simple).
 * @returns El hash de la transacción.
 */
export async function claimTokens(userAddress: Address): Promise<Hex> {
    try {
        // Usamos simulateContract para obtener la solicitud de TX
        const { request } = await publicClient.simulateContract({
            ...CONTRACT_CONFIG,
            functionName: 'claimTokens',
            args: [],
            account: faucetAccount, // Se usa la cuenta del Faucet para pagar el gas
        });
        
        // Escribir la transacción en la blockchain
        const hash = await walletClient.writeContract(request);
        return hash;
    } catch (error: any) {
        console.error("Error en claimTokens:", error.message);
        // Lanzamos un error más limpio al router
        throw new Error(error.message || 'Error al intentar reclamar tokens desde el backend');
    }
}

/**
 * Obtiene el estado del usuario y la info del token usando multicall.
 */
export async function getFaucetStatus(userAddress: Address) {
    
    // 1. Lectura en paralelo usando el patrón correcto de Viem multicall
    const results = await publicClient.multicall({
        contracts: [
            // hasAddressClaimed(address)
            { ...CONTRACT_CONFIG, functionName: 'hasAddressClaimed', args: [userAddress] },
            // balanceOf(address)
            { ...CONTRACT_CONFIG, functionName: 'balanceOf', args: [userAddress] },
            // getFaucetUsers()
            { ...CONTRACT_CONFIG, functionName: 'getFaucetUsers' },
            // getFaucetAmount()
            { ...CONTRACT_CONFIG, functionName: 'getFaucetAmount' },
            // decimals()
            { ...CONTRACT_CONFIG, functionName: 'decimals' },
        ]
    });

    // 2. Extracción y tipificación de resultados
    const hasClaimed = results[0].result as boolean | undefined;
    const balance = results[1].result as bigint | undefined;
    const users = results[2].result as Address[] | undefined;
    const faucetAmount = results[3].result as bigint | undefined;
    const decimals = results[4].result as number | undefined;

    // 3. Formato del balance para el frontend (usando formatUnits para evitar el error de 'bigint')
    let formattedBalance = '0';
    if (balance !== undefined && decimals !== undefined) {
        // formatUnits toma el bigint y lo convierte a un string de número decimal (ej. 1000000000000000000 -> "1.0")
        formattedBalance = formatUnits(balance, decimals);
    }
    
    // 4. Retorno del objeto de estado
    return {
        hasClaimed: hasClaimed ?? false,
        balance: formattedBalance, // String formateado
        users: users ?? [],
        faucetAmount: faucetAmount ? faucetAmount.toString() : '0', // String para JSON
        decimals: decimals ?? 18,
    };
}