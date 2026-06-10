import { z } from 'zod';

export const organizationIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const updateOrganizationStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
});
