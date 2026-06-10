import { z } from 'zod';

export const uuidParamSchema = z.string().uuid();

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const dateRangeQuerySchema = z.object({
  start: z.string().datetime({ offset: true }).or(z.string().date()),
  end: z.string().datetime({ offset: true }).or(z.string().date()),
});

export function parseParamId(value: string | string[]): string {
  const id = Array.isArray(value) ? value[0] : value;
  return uuidParamSchema.parse(id);
}
