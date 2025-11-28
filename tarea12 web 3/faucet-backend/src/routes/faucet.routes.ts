// faucet-backend/src/routes/faucet.routes.ts
import { Router } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.middleware';
import { claimTokens, getFaucetStatus } from '../services/blockchain.service';

const router = Router();

/**
 * POST /faucet/claim (Protegido)
 * Ejecuta la transacción claimTokens() en nombre del usuario autenticado.
 */
router.post('/claim', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
        // La dirección del usuario es extraída y validada por el middleware JWT
        const userAddress = req.user!.address; 
        
        const txHash = await claimTokens(userAddress);
        
        res.json({ 
            success: true, 
            message: 'Transacción de reclamo enviada.', 
            txHash 
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Error al procesar el reclamo.' });
    }
});

/**
 * GET /faucet/status (Protegido)
 * Verifica el estado del usuario.
 */
router.get('/status', authenticateJWT, async (req: AuthenticatedRequest, res) => {
    try {
        // La dirección del usuario es extraída y validada por el middleware JWT
        const userAddress = req.user!.address; 
        
        const status = await getFaucetStatus(userAddress);
        
        // Retorna solo la información relevante según el enunciado
        res.json({
            success: true,
            hasClaimed: status.hasClaimed,
            balance: status.balance, // Ya formateado por el servicio
            users: status.users,
            faucetAmount: status.faucetAmount.toString(),
            decimals: status.decimals
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Error al obtener el estado.' });
    }
});

export default router;