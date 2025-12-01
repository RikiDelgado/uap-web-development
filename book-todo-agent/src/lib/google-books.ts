// /src/lib/google-books.ts

import { SearchBooksParams } from './tools/book-advisor/types';

const API_KEY = process.env.GOOGLE_BOOKS_API_KEY;
const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

// Interfaz para la respuesta simplificada que queremos del libro
export interface BookInfo {
  bookId: string;
  title: string;
  author: string | null;
  thumbnail: string | null;
  descriptionSnippet: string | null;
}

// 1. Lógica para buscar libros (usada por buscarLibros tool)
export async function searchGoogleBooks(params: SearchBooksParams): Promise<BookInfo[]> {
  if (!API_KEY) {
    console.error("GOOGLE_BOOKS_API_KEY no está configurada.");
    return [];
  }
  
  const maxResults = params.maxResults || 10;
  const orderBy = params.orderBy || 'relevance';
  
  const url = `${BASE_URL}?q=${encodeURIComponent(params.query)}&maxResults=${maxResults}&orderBy=${orderBy}&key=${API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error en la API de Google Books: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.items) {
      return [];
    }

    // Mapear la respuesta de la API a un formato simple y consistente
    return data.items.map((item: any) => ({
      bookId: item.id,
      title: item.volumeInfo.title || 'Título Desconocido',
      author: item.volumeInfo.authors ? item.volumeInfo.authors.join(', ') : 'Autor Desconocido',
      thumbnail: item.volumeInfo.imageLinks?.thumbnail || null,
      descriptionSnippet: item.volumeInfo.description 
        ? item.volumeInfo.description.substring(0, 150) + '...' 
        : null,
    }));

  } catch (error) {
    console.error('Error durante la búsqueda de libros:', error);
    throw new Error('No se pudo conectar con la API de Google Books.');
  }
}

// 2. Lógica para obtener detalles completos de un libro (usada por obtenerDetallesDelLibro tool)
export async function fetchBookDetails(bookId: string): Promise<any> {
  if (!API_KEY) {
    console.error("GOOGLE_BOOKS_API_KEY no está configurada.");
    throw new Error("Clave API no configurada.");
  }
  
  const url = `${BASE_URL}/${bookId}?key=${API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error al obtener detalles del libro (ID: ${bookId}).`);
    }
    const data = await response.json();

    // Devolver los datos completos para que el LLM los procese
    return {
      title: data.volumeInfo.title,
      author: data.volumeInfo.authors ? data.volumeInfo.authors.join(', ') : 'Autor Desconocido',
      pages: data.volumeInfo.pageCount || 'N/A',
      publishedDate: data.volumeInfo.publishedDate,
      description: data.volumeInfo.description || 'Sin descripción disponible.',
      categories: data.volumeInfo.categories || [],
      rating: data.volumeInfo.averageRating || 'Sin calificación',
      // Se pueden incluir más campos si son útiles para el LLM
    };

  } catch (error) {
    console.error(`Error al obtener detalles del libro ${bookId}:`, error);
    throw new Error('No se pudieron obtener los detalles del libro.');
  }
}