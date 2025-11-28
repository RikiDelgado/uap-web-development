// faucet-backend/src/routes/auth.routes.ts
import { Router } from 'express';
// 🚨 CORRECCIÓN: Importar generateNonce directamente
import { SiweMessage, generateNonce } from 'siwe'; 
import { generateToken } from '../middleware/auth.middleware';
import { Address } from 'viem';

const router = Router();

// Mapa para almacenar mensajes generados que esperan ser firmados
const nonceStore = new Map<Address, string>();

/**
 * POST /auth/message
 * Genera un mensaje SIWE nonce.
 */
router.post('/message', async (req, res) => {
    try {
        const { address } = req.body;
        if (!address) {
            return res.status(400).json({ success: false, message: 'Falta la dirección de la wallet.' });
        }
        
        // 🚨 CORRECCIÓN: Usar la función importada generateNonce()
        const nonce = generateNonce(); 
        // Guardamos el nonce esperando la firma del usuario
        nonceStore.set(address, nonce); 
        
        const message = new SiweMessage({
            domain: req.headers.host || 'localhost:3000',
            address,
            statement: 'Firma para iniciar sesion en Faucet Dapp.',
            uri: 'http://localhost:3000',
            version: '1',
            chainId: 11155111, // Sepolia ID
            nonce: nonce,
        });

        res.json({ success: true, message: message.prepareMessage() });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al generar mensaje' });
    }
});

/**
 * POST /auth/signin
 * Valida el mensaje firmado y retorna el JWT.
 */
router.post('/signin', async (req, res) => {
    try {
        const { message, signature } = req.body;
        
        if (!message || !signature) {
            return res.status(400).json({ success: false, message: 'Faltan campos: message o signature' });
        }
        
        // El constructor de SiweMessage requiere un objeto, por eso lo pasamos
        const siweMessage = new SiweMessage(message);
        
        // 1. Validar Nonce: Debe coincidir con el que generamos
        const storedNonce = nonceStore.get(siweMessage.address as Address);
        if (!storedNonce || storedNonce !== siweMessage.nonce) {
            return res.status(401).json({ success: false, message: 'Nonce inválido o no encontrado.' });
        }

        // 2. Validar la firma
        // siweMessage.verify() puede lanzar un error si la firma no es válida
        await siweMessage.verify({ signature });

        // Limpiamos el nonce para que no pueda ser reusado
        nonceStore.delete(siweMessage.address as Address); 

        // 3. Generar JWT
        const token = generateToken(siweMessage.address as Address);
        
        res.json({ 
            success: true, 
            token, 
            address: siweMessage.address 
        });

    } catch (error: any) {
        console.error("Error en /signin:", error);
        res.status(401).json({ success: false, message: 'Firma no válida o mensaje alterado.' });
    }
});

export default router;