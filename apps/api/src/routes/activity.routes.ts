import { Router, Response, NextFunction } from 'express';
import * as activityService from '../services/activity.service';
import { AuthenticatedRequest } from '../middleware/auth';
import { protectedMiddleware } from '../middleware/protected';
import { requirePermission } from '../middleware/permissions';
import { Permission } from '../lib/permissions';
import {
  listActivityQuerySchema,
  projectActivityParamsSchema,
} from '../validators/activity.validators';

const router = Router();

router.use(...protectedMiddleware);

router.get(
  '/org',
  requirePermission(Permission.ORG_READ),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { limit } = listActivityQuerySchema.parse(req.query);
      const activities = await activityService.listOrgActivity(limit);
      res.json({ activities });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/project/:projectId',
  requirePermission(Permission.PROJECT_LIST),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { projectId } = projectActivityParamsSchema.parse(req.params);
      const { limit } = listActivityQuerySchema.parse(req.query);
      const activities = await activityService.listProjectActivity(projectId, limit);
      res.json({ activities });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
