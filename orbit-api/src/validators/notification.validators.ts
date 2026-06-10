import { z } from 'zod';
import { paginationSchema } from './common.validators';

export const listNotificationsQuerySchema = paginationSchema;

export const notificationIdParamsSchema = z.object({
  id: z.string().uuid(),
});
