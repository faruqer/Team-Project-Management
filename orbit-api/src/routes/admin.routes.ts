import { Router, Response, NextFunction } from 'express';
import { OrganizationStatus } from '@prisma/client';
import * as adminService from '../services/admin.service';
import { AuthenticatedRequest } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { platformAdminMiddleware } from '../middleware/platform-admin';
import {
  organizationIdParamsSchema,
  updateOrganizationStatusSchema,
} from '../validators/admin.validators';

const router = Router();

router.use(authMiddleware, platformAdminMiddleware);

router.get('/organizations', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const organizations = await adminService.listAllOrganizations();
    res.json({ organizations });
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/organizations/:id/status',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = organizationIdParamsSchema.parse(req.params);
      const { status } = updateOrganizationStatusSchema.parse(req.body);
      const organization = await adminService.updateOrganizationStatus(
        id,
        status as OrganizationStatus,
      );
      res.json({ organization });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
