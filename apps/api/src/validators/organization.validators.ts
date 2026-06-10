import { z } from 'zod';

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  timezone: z.string().min(1).max(100).optional(),
  currency: z.string().length(3).optional(),
  theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']).optional(),
});
