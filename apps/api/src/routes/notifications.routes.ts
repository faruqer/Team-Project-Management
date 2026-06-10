import { Router, Response, NextFunction } from 'express';
import * as notificationService from '../services/notification.service';
import { AuthenticatedRequest } from '../middleware/auth';
import { protectedMiddleware } from '../middleware/protected';
import {
  listNotificationsQuerySchema,
  notificationIdParamsSchema,
} from '../validators/notification.validators';

const router = Router();

router.use(...protectedMiddleware);

router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { limit } = listNotificationsQuerySchema.parse(req.query);
    const notifications = await notificationService.listNotifications(limit);
    res.json({ notifications });
  } catch (err) {
    next(err);
  }
});

router.get('/unread-count', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const count = await notificationService.getUnreadCount();
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

router.patch('/read-all', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await notificationService.markAllAsRead();
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/:id/read',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = notificationIdParamsSchema.parse(req.params);
      const notification = await notificationService.markAsRead(id);
      res.json({ notification });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
