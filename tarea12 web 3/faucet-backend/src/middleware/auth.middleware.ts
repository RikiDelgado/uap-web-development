// faucet-backend/src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Address } from 'viem';

// Define la estructura de datos del JWT (payload)
export interface AuthTokenPayload {
    address: Address;
    exp: number; // Expiración
    iat: number; // Emitido en
}

// Extender el Request para incluir el campo `user`
export interface AuthenticatedRequest extends Request {
    user?: AuthTokenPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Middleware de protección: Verifica el JWT
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1]; // Espera "Bearer <token>"

        if (!token) {
            return res.status(401).json({ success: false, message: 'Falta token de autenticación (Bearer)' });
        }

        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                // Token inválido, expirado, o alterado
                return res.status(403).json({ success: false, message: 'Token inválido o expirado' });
            }
            // Adjunta la dirección del usuario al request
            (req as AuthenticatedRequest).user = user as AuthTokenPayload;
            next();
        });
    } else {
        res.status(401).json({ success: false, message: 'No se proporcionó encabezado de autorización' });
    }
};

/**
 * Genera un JWT para el usuario autenticado.
 */
export const generateToken = (address: Address): string => {
    const payload: Omit<AuthTokenPayload, 'exp' | 'iat'> = { address };
    // Token expira en 1 hora
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }); 
};