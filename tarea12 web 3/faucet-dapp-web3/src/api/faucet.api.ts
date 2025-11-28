// faucet-dapp-web3/src/api/faucet.api.ts
const BASE_URL = 'http://localhost:3000'; // URL del backend Express

// Función auxiliar para manejar encabezados con o sin JWT
function getHeaders(token: string | null = null) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

// --- Autenticación (SIWE) ---

export async function getSiweMessage(address: string) {
    const response = await fetch(`${BASE_URL}/auth/message`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ address }),
    });
    if (!response.ok) throw new Error('Error al obtener el mensaje SIWE');
    const data = await response.json();
    return data.message as string;
}

export async function signIn(message: object, signature: string) {
    const response = await fetch(`${BASE_URL}/auth/signin`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ message, signature }),
    });
    const data = await response.json();
    if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Fallo la autenticación SIWE');
    }
    return { token: data.token as string, address: data.address as string };
}

// --- Interacciones con el Faucet (Protegidas) ---

interface FaucetStatus {
    hasClaimed: boolean;
    balance: string;
    users: string[];
    faucetAmount: string;
    decimals: number;
}

export async function getProtectedStatus(token: string): Promise<FaucetStatus> {
    const response = await fetch(`${BASE_URL}/faucet/status`, {
        method: 'GET',
        headers: getHeaders(token),
    });
    const data = await response.json();
    if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Fallo la verificación de estado protegida');
    }
    return data as FaucetStatus;
}

export async function claimTokensApi(token: string) {
    const response = await fetch(`${BASE_URL}/faucet/claim`, {
        method: 'POST',
        headers: getHeaders(token),
    });
    const data = await response.json();
    if (!response.ok || data.success === false) {
        throw new Error(data.message || 'Fallo el reclamo de tokens');
    }
    return data.txHash as string;
}