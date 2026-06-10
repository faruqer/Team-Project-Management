import { z } from 'zod';

export const calendarQuerySchema = z.object({
  start: z.string().min(1),
  end: z.string().min(1),
});
