// /src/lib/tools/todo-manager/index.ts

import { z } from 'zod';
import {
  createTaskSchema, updateTaskSchema, deleteTaskSchema,
  searchTasksSchema, getTaskStatsSchema,
  CreateTaskParams, UpdateTaskParams, DeleteTaskParams,
  SearchTasksParams, GetTaskStatsParams
} from './types';
import prisma from '@/lib/prisma'; // Importamos el cliente de Prisma

// ⚠️ MOCK: DEBE ser reemplazado por el ID real del usuario autenticado.
const MOCK_USER_ID = "user-123";

// Función auxiliar para mapear prioridad/categoría (ej: "alto" -> "high")
const mapInputToDb = (input: string | undefined): string | undefined => {
    if (!input) return undefined;
    // La DB usa 'low', 'medium', 'high', 'work', 'personal', etc.
    const lower = input.toLowerCase().replace('á', 'a').replace('é', 'e'); 
    if (['alto', 'alta'].includes(lower)) return 'high';
    if (['bajo', 'baja'].includes(lower)) return 'low';
    if (['trabajo', 'laboral'].includes(lower)) return 'work';
    // Mantiene 'medium', 'personal', etc., si ya coincide.
    return lower;
};

// --- 1. crearTarea (Prisma) ------------------------------------------------
const crearTarea = async (params: CreateTaskParams) => {
  const newTask = await prisma.task.create({ 
    data: { 
      userId: MOCK_USER_ID, 
      title: params.title,
      priority: mapInputToDb(params.priority) || 'medium',
      category: mapInputToDb(params.category) || 'personal',
      dueDate: params.dueDate ? new Date(params.dueDate) : undefined,
    }
  });

  return JSON.stringify({ 
    success: true, 
    taskId: newTask.id, 
    title: newTask.title,
    priority: newTask.priority,
    message: `Tarea "${newTask.title}" creada con éxito.`
  });
};

// --- 2. actualizarTarea (Prisma) -------------------------------------------
const actualizarTarea = async (params: UpdateTaskParams) => {
  const data: any = {};
  
  if (params.title) data.title = params.title;
  if (params.completed !== undefined) data.completed = params.completed;
  if (params.priority) data.priority = mapInputToDb(params.priority);
  if (params.category) data.category = mapInputToDb(params.category);
  if (params.dueDate) data.dueDate = new Date(params.dueDate);

  const updatedTask = await prisma.task.update({ 
    where: { 
      id: params.taskId,
      userId: MOCK_USER_ID
    }, 
    data: data 
  });

  return JSON.stringify({ 
    success: true, 
    taskId: updatedTask.id, 
    title: updatedTask.title,
    completed: updatedTask.completed,
    message: `Tarea "${updatedTask.title}" actualizada.` 
  });
};

// --- 3. eliminarTarea (Prisma - Soft Delete) -------------------------------
const eliminarTarea = async (params: DeleteTaskParams) => {
  // 🟢 LÓGICA REAL: Eliminación Suave (Soft Delete)
  const deletedTask = await prisma.task.update({
    where: { 
      id: params.taskId, 
      userId: MOCK_USER_ID
    },
    data: { deletedAt: new Date() }
  });

  return JSON.stringify({ 
    success: true, 
    title: deletedTask.title,
    message: `Tarea "${deletedTask.title}" eliminada exitosamente.` 
  });
};

// --- 4. buscarTareas (Prisma - Filtros y Búsqueda) -------------------------
const buscarTareas = async (params: SearchTasksParams) => {
  const where: any = { 
    userId: MOCK_USER_ID,
    deletedAt: null // Excluir eliminadas suavemente
  };

  if (params.completed !== undefined) where.completed = params.completed;
  if (params.priority) where.priority = mapInputToDb(params.priority);
  if (params.category) where.category = mapInputToDb(params.category);
  
  if (params.query) {
    where.title = { contains: params.query, mode: 'insensitive' };
  }

  // Filtrado por rango de fecha
  if (params.dueDateFrom || params.dueDateTo) {
    where.dueDate = {};
    if (params.dueDateFrom) where.dueDate.gte = new Date(params.dueDateFrom);
    if (params.dueDateTo) where.dueDate.lte = new Date(params.dueDateTo);
  }

  const tasks = await prisma.task.findMany({ 
    where, 
    take: params.limit || 50,
    orderBy: { 
      [params.sortBy || 'createdAt']: params.sortOrder || 'desc'
    } as any, 
    select: { id: true, title: true, completed: true, priority: true, dueDate: true }
  });

  return JSON.stringify(tasks);
};

// --- 5. obtenerEstadisticasDeTareas (Prisma - Agregaciones) ----------------
const obtenerEstadisticasDeTareas = async (params: GetTaskStatsParams) => {
  
  const baseWhere = { userId: MOCK_USER_ID, deletedAt: null };

  const totalTasks = await prisma.task.count({ where: baseWhere });
  const completedTasks = await prisma.task.count({ where: { ...baseWhere, completed: true } });
  const pendingTasks = totalTasks - completedTasks;

  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  const byPriority = await prisma.task.groupBy({
    by: ['priority'],
    _count: { id: true },
    where: baseWhere,
  });

  const nextDueTask = await prisma.task.findFirst({
    where: { ...baseWhere, completed: false, dueDate: { not: null, gte: new Date() } },
    orderBy: { dueDate: 'asc' },
    select: { title: true, dueDate: true, priority: true }
  });

  return JSON.stringify({
    summary: {
      totalTasks,
      completedTasks,
      pendingTasks,
      completionRate: completionRate.toFixed(1),
      overdueTasks: "Cálculo avanzado pendiente", 
    },
    byPriority: byPriority.map(p => ({ priority: p.priority, count: p._count.id })),
    upcomingTask: nextDueTask,
  });
};

// Array principal de herramientas para Vercel AI SDK
export const todoManagerTools = [
  { type: "function" as const, function: { name: "crearTarea", parameters: createTaskSchema, execute: crearTarea } },
  { type: "function" as const, function: { name: "actualizarTarea", parameters: updateTaskSchema, execute: actualizarTarea } },
  { type: "function" as const, function: { name: "eliminarTarea", parameters: deleteTaskSchema, execute: eliminarTarea } },
  { type: "function" as const, function: { name: "buscarTareas", parameters: searchTasksSchema, execute: buscarTareas } },
  { type: "function" as const, function: { name: "obtenerEstadisticasDeTareas", parameters: getTaskStatsSchema, execute: obtenerEstadisticasDeTareas } },
] as const;

export type TodoManagerTool = (typeof todoManagerTools)[number];