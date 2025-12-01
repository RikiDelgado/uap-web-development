// /src/lib/tools/book-advisor/types.ts

import { z } from 'zod';

// Esquema de la herramienta: buscarLibros
export const searchBooksSchema = z.object({
  query: z.string().describe("Título, autor, tema o palabras clave para buscar."),
  maxResults: z.number().int().min(1).max(40).optional().describe("Número máximo de resultados a devolver (máx. 40)."),
  orderBy: z.enum(['relevance', 'newest']).optional().describe("Criterio de ordenamiento ('relevance' o 'newest').")
});

// Esquema de la herramienta: obtenerDetallesDelLibro
export const getBookDetailsSchema = z.object({
  bookId: z.string().describe("ID único de Google Books del libro."),
});

// Esquema de la herramienta: agregarALaListaDeLectura
export const addToReadingListSchema = z.object({
  bookId: z.string().describe("ID único de Google Books del libro a agregar."),
  priority: z.enum(['alto', 'medio', 'bajo']).optional().describe("Nivel de prioridad."),
  notes: z.string().optional().describe("Notas personales del usuario."),
});

// Esquema de la herramienta: obtenerListaDeLectura
export const getReadingListSchema = z.object({
  filter: z.string().optional().describe("Filtro opcional por prioridad, estado ('READ', 'TO_READ'), etc."),
  limit: z.number().int().min(1).max(100).optional().describe("Número máximo de resultados a devolver."),
});

// Esquema de la herramienta: marcarComoLeido
export const markAsReadSchema = z.object({
  bookId: z.string().describe("ID único de Google Books del libro."),
  rating: z.number().int().min(1).max(5).optional().describe("Calificación de 1 a 5 estrellas."),
  review: z.string().optional().describe("Revisión personal del usuario."),
  dateFinished: z.string().optional().describe("Fecha de finalización en formato ISO 8601 (YYYY-MM-DD)."),
});

// Esquema de la herramienta: obtenerEstadisticasDeLectura
export const getReadingStatsSchema = z.object({
  period: z.enum(['all_time', 'year', 'month', 'week']).optional().describe("Periodo de tiempo para las estadísticas."),
  groupBy: z.enum(['genre', 'author', 'year']).optional().describe("Agrupación de estadísticas."),
});

// Tipos de las funciones
export type SearchBooksParams = z.infer<typeof searchBooksSchema>;
export type GetBookDetailsParams = z.infer<typeof getBookDetailsSchema>;
export type AddToReadingListParams = z.infer<typeof addToReadingListSchema>;
export type GetReadingListParams = z.infer<typeof getReadingListSchema>;
export type MarkAsReadParams = z.infer<typeof markAsReadSchema>;
export type GetReadingStatsParams = z.infer<typeof getReadingStatsSchema>;