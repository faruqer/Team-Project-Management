import { z } from 'zod';

const projectStatuses = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'] as const;

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(projectStatuses).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  memberIds: z.array(z.string().uuid()).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(projectStatuses).optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

export const setProjectMembersSchema = z.object({
  memberIds: z.array(z.string().uuid()),
});
