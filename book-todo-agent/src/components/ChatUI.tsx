// /src/components/ChatUI.tsx

'use client';

import { useChat } from 'ai/react';
import React, { useState } from 'react';

// Interfaz para mostrar las diferentes herramientas en el frontend
interface ToolSelectorProps {
  currentPath: string;
  onSelect: (path: string) => void;
}

const ToolSelector: React.FC<ToolSelectorProps> = ({ currentPath, onSelect }) => (
  <div className="flex justify-center p-4 bg-gray-100 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
    <button
      onClick={() => onSelect('/api/book-chat')}
      className={`px-4 py-2 mx-2 rounded-lg transition-colors font-medium ${
        currentPath === '/api/book-chat' ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 border border-indigo-600 dark:bg-zinc-700 dark:text-white'
      }`}
    >
      📚 Asesor de Libros
    </button>
    <button
      onClick={() => onSelect('/api/todo-chat')}
      className={`px-4 py-2 mx-2 rounded-lg transition-colors font-medium ${
        currentPath === '/api/todo-chat' ? 'bg-green-600 text-white' : 'bg-white text-green-600 border border-green-600 dark:bg-zinc-700 dark:text-white'
      }`}
    >
      ✅ AI Todo Manager
    </button>
  </div>
);

export function ChatUI() {
  const [apiPath, setApiPath] = useState('/api/book-chat'); // Estado para seleccionar la API

  // Hook principal del AI SDK, usa el path dinámico
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: apiPath,
  });

  return (
    <div className="flex flex-col h-screen w-full max-w-3xl mx-auto bg-white dark:bg-zinc-900 shadow-xl">
      
      <ToolSelector currentPath={apiPath} onSelect={setApiPath} />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
            <h2 className="text-xl font-semibold">¡Bienvenido!</h2>
            <p>Selecciona una herramienta y comienza a chatear.</p>
            <p className="text-sm mt-2">Ejemplo: "Busca novelas de Gabriel García Márquez" o "Agrega tarea: Llamar al doctor"</p>
          </div>
        )}
        {messages.map((m, index) => (
          <div
            key={index}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs sm:max-w-md p-3 rounded-xl shadow-md ${
                m.role === 'user'
                  ? 'bg-indigo-500 text-white rounded-br-none'
                  : 'bg-gray-200 text-black rounded-tl-none dark:bg-zinc-800 dark:text-white'
              }`}
            >
              <p className="font-semibold text-sm capitalize mb-1">
                {m.role === 'user' ? 'Tú' : apiPath === '/api/book-chat' ? '📚 Asesor IA' : '✅ Todo IA'}
              </p>
              {/* Renderiza el contenido. Si el mensaje es una llamada a herramienta, puedes mostrarla aquí. */}
              <div className="whitespace-pre-wrap">{m.content}</div>
              {/* Opcional: Indicador de Tool Call */}
              {m.toolInvocations && m.toolInvocations.length > 0 && (
                <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                    ⚙️ Ejecutando herramienta...
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && messages.filter(m => m.role !== 'user').length === messages.length && (
          <div className="flex justify-start">
            <div className="max-w-md p-3 rounded-xl bg-gray-200 dark:bg-zinc-800 shadow-md">
              <span className="animate-pulse">Pensando...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-zinc-700">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 dark:bg-zinc-700 dark:border-zinc-600 dark:text-white"
            value={input}
            placeholder="Pregunta o da una orden..."
            onChange={handleInputChange}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || input.trim() === ''}
            className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
              isLoading || input.trim() === ''
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}