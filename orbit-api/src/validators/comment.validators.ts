import { z } from 'zod';

export const createCommentSchema = z.object({
  body: z.string().min(1).max(10000),
  parentId: z.string().uuid().nullable().optional(),
});

export const updateCommentSchema = z.object({
  body: z.string().min(1).max(10000),
});
