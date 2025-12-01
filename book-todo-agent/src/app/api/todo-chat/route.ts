// src/app/api/todo-chat/route.ts
import { streamText } from 'ai';
import { createToolResultPart } from 'ai/tool-call';
import { openai } from '@ai-sdk/openai';
import { todoManagerTools } from '@/lib/tools/todo-manager';

const openrouter = openai({
  baseURL: process.env.OPENROUTER_BASE_URL,
  apiKey: process.env.OPENROUTER_API_KEY,
});

const SYSTEM_PROMPT = `Eres un asistente de gestión de tareas llamado Todo-AI. ... Responde en español.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const modelName = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku';

    const result = await streamText({
      model: modelName,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      tools: todoManagerTools as any,
    });

    return result.toAIStream({
      onToolCall: async ({ toolName, args, toolCallId }: any) => {
        const selectedTool = (todoManagerTools as any).find((t: any) => t.function?.name === toolName);

        if (!selectedTool) {
          return createToolResultPart({
            toolCallId,
            result: JSON.stringify({ error: `La herramienta ${toolName} no está definida.` }),
          });
        }

        try {
          const toolOutput = await selectedTool.function.execute(args);
          return createToolResultPart({ toolCallId, result: toolOutput });
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
