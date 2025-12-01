// /src/lib/prisma.ts

import { PrismaClient } from '@prisma/client';

// Agregamos el cliente de Prisma a la variable global de Node.js en desarrollo
// para evitar que Next.js cree nuevas instancias en cada Hot Reload.
declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient({
  // Opcional: para ver las queries de Prisma en la consola
  // log: ['query', 'info', 'warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;