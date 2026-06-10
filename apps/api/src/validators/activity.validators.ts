import { z } from 'zod';
import { paginationSchema } from './common.validators';

export const listActivityQuerySchema = paginationSchema;

export const projectActivityParamsSchema = z.object({
  projectId: z.string().uuid(),
});
