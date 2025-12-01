// prisma.config.ts
import * as dotenv from 'dotenv';
// Carga las variables del archivo .env.local
dotenv.config({ path: '.env.local' });

// Exporta la configuración requerida por Migrate
export default {
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
      provider: 'postgresql', 
    },
  },
};