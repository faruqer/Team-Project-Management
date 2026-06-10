import { Router, Response, NextFunction } from 'express';
import * as analyticsService from '../services/analytics.service';
import { AuthenticatedRequest } from '../middleware/auth';
import { protectedMiddleware } from '../middleware/protected';
import { requirePermission } from '../middleware/permissions';
import { Permission } from '../lib/permissions';

const router = Router();

router.use(...protectedMiddleware);

router.get(
  '/summary',
  requirePermission(Permission.PROJECT_LIST),
  async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const summary = await analyticsService.getAnalyticsSummary();
      res.json({ summary });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
