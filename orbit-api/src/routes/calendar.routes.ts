import { Router, Response, NextFunction } from 'express';
import * as calendarService from '../services/calendar.service';
import { AuthenticatedRequest } from '../middleware/auth';
import { protectedMiddleware } from '../middleware/protected';
import { requirePermission } from '../middleware/permissions';
import { Permission } from '../lib/permissions';
import { calendarQuerySchema } from '../validators/calendar.validators';

const router = Router();

router.use(...protectedMiddleware);

router.get(
  '/events',
  requirePermission(Permission.PROJECT_LIST),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { start, end } = calendarQuerySchema.parse(req.query);
      const events = await calendarService.getCalendarEvents(new Date(start), new Date(end));
      res.json({ events });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
