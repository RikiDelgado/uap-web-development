// faucet-backend/src/server.ts
import 'dotenv/config'; // Carga las variables de .env
import express, { json } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import faucetRoutes from './routes/faucet.routes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: 'http://localhost:5173', // Permitir solicitudes solo desde el frontend (Vite default)
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(json()); // Para parsear el body de requests POST en formato JSON

// Rutas de la API
app.use('/auth', authRoutes);
app.use('/faucet', faucetRoutes);

// Manejo de rutas no encontradas
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 Servidor Backend iniciado en http://localhost:${PORT}`);
  console.log(`======================================================`);
  console.log(`Advertencia: La clave privada del Faucet se usa en el backend.`);
});