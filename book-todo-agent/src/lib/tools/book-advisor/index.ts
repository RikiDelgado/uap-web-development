// /src/lib/tools/book-advisor/index.ts (REEMPLAZAR LOS COMENTARIOS Y LÍNEAS MOCK)

import { z } from 'zod';
// Importamos los tipos de los esquemas
import {
  searchBooksSchema, getBookDetailsSchema, addToReadingListSchema,
  getReadingListSchema, markAsReadSchema, getReadingStatsSchema,
  SearchBooksParams, GetBookDetailsParams, AddToReadingListParams,
  GetReadingListParams, MarkAsReadParams, GetReadingStatsParams
} from './types';

// ⚠️ Importamos el cliente de Prisma y las funciones de Google Books
import prisma from '@/lib/prisma';
import { searchGoogleBooks, fetchBookDetails } from '@/lib/google-books'; 

// MOCK: DEBE ser reemplazado por un sistema de autenticación real
const MOCK_USER_ID = "user-123"; 

// --- 1. buscarLibros (Usa Google Books API) ---------------------------
const buscarLibros = async (params: SearchBooksParams) => {
  console.log(`Buscando libros con query: ${params.query}`);
  
  // 🟢 LÓGICA REAL: LLAMADA A GOOGLE BOOKS
  const data = await searchGoogleBooks(params);
  
  // Devolvemos el resultado serializado para que el LLM lo interprete
  return JSON.stringify(data);
};

// --- 2. obtenerDetallesDelLibro (Usa Google Books API) ----------------
const obtenerDetallesDelLibro = async (params: GetBookDetailsParams) => {
  console.log(`Obteniendo detalles del libro: ${params.bookId}`);
  
  // 🟢 LÓGICA REAL: LLAMADA A GOOGLE BOOKS
  const data = await fetchBookDetails(params.bookId);

  return JSON.stringify(data);
};

// --- 3. agregarALaListaDeLectura (Usa Prisma DB) ----------------------
const agregarALaListaDeLectura = async (params: AddToReadingListParams) => {
  // Primero, obtenemos los detalles básicos (título y autor) para guardarlos en la DB
  const bookDetails = await fetchBookDetails(params.bookId);

  if (!bookDetails) {
    throw new Error("Libro no encontrado o detalles incompletos.");
  }
  
  // 🟢 LÓGICA REAL: CREAR REGISTRO EN PRISMA
  const newBookEntry = await prisma.readingListBook.create({
    data: { 
      userId: MOCK_USER_ID, 
      bookId: params.bookId, 
      title: bookDetails.title || 'Título Desconocido',
      author: bookDetails.author || 'Autor Desconocido', 
      priority: params.priority || 'medium', 
      notes: params.notes 
    }
  });

  return JSON.stringify({ success: true, message: `El libro "${newBookEntry.title}" fue agregado a tu lista con prioridad ${newBookEntry.priority}.` });
};

// --- 4. obtenerListaDeLectura (Usa Prisma DB) -------------------------
const obtenerListaDeLectura = async (params: GetReadingListParams) => {
  console.log(`Recuperando lista de lectura con límite: ${params.limit}`);
  
  // 🟢 LÓGICA REAL: FILTROS Y BÚSQUEDA DE PRISMA
  const list = await prisma.readingListBook.findMany({ 
    where: { 
      userId: MOCK_USER_ID, 
      status: 'TO_READ', 
      // Puedes agregar lógica para el filtro de texto aquí:
      // priority: params.filter?.toLowerCase() === 'alto' ? 'high' : undefined 
    },
    take: params.limit || 50,
    orderBy: { dateAdded: 'desc' }
  });

  return JSON.stringify(list);
};

// --- 5. marcarComoLeido (Usa Prisma DB) -------------------------------
const marcarComoLeido = async (params: MarkAsReadParams) => {
  console.log(`Marcando libro ${params.bookId} como leído con rating: ${params.rating}`);

  // 🟢 LÓGICA REAL: ACTUALIZAR REGISTRO EN PRISMA
  const updatedBook = await prisma.readingListBook.update({ 
    where: { 
      // Usamos @unique fields
      bookId: params.bookId, 
    },
    data: { 
      status: 'READ', 
      rating: params.rating, 
      review: params.review,
      dateFinished: params.dateFinished ? new Date(params.dateFinished) : new Date(),
    }
  });

  // Aquí podrías desencadenar la actualización de estadísticas (getReadingStats)
  
  return JSON.stringify({ success: true, message: `¡Felicidades! "${updatedBook.title}" fue marcado como leído con ${updatedBook.rating || 5} estrellas.` });
};

// --- 6. obtenerEstadisticasDeLectura (Usa Prisma DB) ------------------
const obtenerEstadisticasDeLectura = async (params: GetReadingStatsParams) => {
  console.log(`Calculando estadísticas de lectura para el periodo: ${params.period}`);
  
  // 🟢 LÓGICA REAL: CÁLCULOS AGREGADOS DE PRISMA
  const totalRead = await prisma.readingListBook.count({
    where: { userId: MOCK_USER_ID, status: 'READ' }
  });
  
  const avgRating = await prisma.readingListBook.aggregate({
    _avg: { rating: true },
    where: { userId: MOCK_USER_ID, status: 'READ', rating: { not: null } }
  });

  // Esto es un cálculo complejo, el LLM puede interpretarlo
  return JSON.stringify({
    totalRead: totalRead, 
    averageRating: avgRating._avg.rating?.toFixed(1) || "N/A",
    note: "La implementación completa de géneros y páginas requeriría consultas más complejas, pero el total leído y la media están calculados."
  });
};

// El array bookAdvisorTools permanece sin cambios
export const bookAdvisorTools = [
// ... (mismo contenido)
];

export type BookAdvisorTool = (typeof bookAdvisorTools)[number];