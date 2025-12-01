// src/app/api/book-chat/route.ts
import { streamText } from 'ai';
import { createToolResultPart } from 'ai/tool-call';
import { openai } from '@ai-sdk/openai';
import { bookAdvisorTools } from '@/lib/tools/book-advisor';
const openrouter = openai({
  baseURL: process.env.OPENROUTER_BASE_URL,
  apiKey: process.env.OPENROUTER_API_KEY,
});

const MOCK_USER_ID = "user-123";

const SYSTEM_PROMPT = `Eres un experto y amigable asesor de libros. ... Responde en español.`; // acortado por claridad

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Pasamos el nombre del modelo como string (evita dependencias a objetos SDK que cambian entre versiones)
    const modelName = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku';

    const result = await streamText({
      model: modelName,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      // evitamos problemas de tipos forzando any. Si más adelante querés tipar bien, definimos CoreTool correcto.
      tools: bookAdvisorTools as any,
    });

    return result.toAIStream({
      // onToolCall tiene forma libre para no romper por mismatched types
      onToolCall: async ({ toolName, args, toolCallId }: any) => {
        const selectedTool = (bookAdvisorTools as any).find((t: any) => t.function?.name === toolName);

        if (!selectedTool) {
          return createToolResultPart({
            toolCallId,
            result: JSON.stringify({ error: `La herramienta ${toolName} no está definida.` }),
          });
        }

        try {
          const toolOutput = await selectedTool.function.execute(args);
          return createToolResultPart({
            toolCallId,
            result: toolOutput,
          });
        } catch (err: any) {
          console.error(`Error al ejecutar la herramienta ${toolName}:`, err);
          return createToolResultPart({
            toolCallId,
            result: JSON.stringify({ error: `Error al ejecutar la herramienta ${toolName}: ${err?.message ?? err}` }),
          });
        }
      },
    });

  } catch (error) {
    console.error('Error en la ruta de chat:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor.' }), { status: 500 });
  }
}
