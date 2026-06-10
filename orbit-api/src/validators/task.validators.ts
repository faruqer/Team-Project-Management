import { z } from 'zod';

const taskStatuses = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const;
const taskPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export const createTaskSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(10000).optional(),
  status: z.enum(taskStatuses).optional(),
  priority: z.enum(taskPriorities).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(10000).nullable().optional(),
  status: z.enum(taskStatuses).optional(),
  priority: z.enum(taskPriorities).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export const moveTaskSchema = z.object({
  status: z.enum(taskStatuses),
  position: z.number().int().min(0),
});
