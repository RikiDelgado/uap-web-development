// /src/lib/tools/todo-manager/types.ts

import { z } from 'zod';

// Tipos base para Task
const TaskPriority = z.enum(['bajo', 'medio', 'alto']);
const TaskCategory = z.enum(['trabajo', 'personal', 'compras', 'salud', 'otro']);

// Esquema de la herramienta: crearTarea
export const createTaskSchema = z.object({
  title: z.string().min(1).describe("Título o descripción de la tarea."),
  priority: TaskPriority.optional().describe("Nivel de prioridad."),
  dueDate: z.string().optional().describe("Fecha límite en formato ISO 8601 (YYYY-MM-DD)."),
  category: TaskCategory.optional().describe("Categoría de la tarea."),
});

// Esquema de la herramienta: actualizarTarea
export const updateTaskSchema = z.object({
  taskId: z.string().describe("ID único de la tarea a modificar."),
  title: z.string().min(1).optional().describe("Nuevo título (opcional)."),
  completed: z.boolean().optional().describe("Estado de completitud (true/false)."),
  priority: TaskPriority.optional().describe("Nueva prioridad (opcional)."),
  dueDate: z.string().optional().describe("Nueva fecha límite (opcional)."),
  category: TaskCategory.optional().describe("Nueva categoría (opcional)."),
});

// Esquema de la herramienta: eliminarTarea
export const deleteTaskSchema = z.object({
  taskId: z.string().describe("ID único de la tarea a eliminar. Usa el ID devuelto por searchTasks."),
  confirm: z.boolean().optional().describe("Bandera de confirmación, requerida para acciones masivas."),
});

// Esquema de la herramienta: buscarTareas
export const searchTasksSchema = z.object({
  query: z.string().optional().describe("Texto de búsqueda en título/descripción."),
  completed: z.boolean().optional().describe("Filtrar por estado: true (completadas), false (pendientes)."),
  priority: TaskPriority.optional().describe("Filtrar por prioridad."),
  category: TaskCategory.optional().describe("Filtrar por categoría."),
  dueDateFrom: z.string().optional().describe("Fecha de inicio del rango (ISO 8601)."),
  dueDateTo: z.string().optional().describe("Fecha de fin del rango (ISO 8601)."),
  sortBy: z.enum(['createdAt', 'dueDate', 'priority', 'title']).optional().describe("Campo de ordenamiento."),
  sortOrder: z.enum(['asc', 'desc']).optional().describe("Orden ascendente o descendente."),
  limit: z.number().int().min(1).max(100).optional().describe("Máximo de resultados."),
});

// Esquema de la herramienta: obtenerEstadisticasDeTareas
export const getTaskStatsSchema = z.object({
  period: z.enum(['today', 'week', 'month', 'year', 'all_time']).optional().describe("Periodo de tiempo."),
  groupBy: z.enum(['category', 'priority', 'date']).optional().describe("Agrupación de estadísticas."),
});

// Tipos de las funciones
export type CreateTaskParams = z.infer<typeof createTaskSchema>;
export type UpdateTaskParams = z.infer<typeof updateTaskSchema>;
export type DeleteTaskParams = z.infer<typeof deleteTaskSchema>;
export type SearchTasksParams = z.infer<typeof searchTasksSchema>;
export type GetTaskStatsParams = z.infer<typeof getTaskStatsSchema>;