import { Router, Response, NextFunction } from 'express';
import * as orgService from '../services/organization.service';
import { AuthenticatedRequest } from '../middleware/auth';
import { protectedMiddleware } from '../middleware/protected';
import { requirePermission } from '../middleware/permissions';
import { Permission } from '../lib/permissions';
import { updateOrganizationSchema } from '../validators/organization.validators';
import { logoUpload, buildUploadUrl } from '../lib/upload';

const router = Router();

router.use(...protectedMiddleware);

router.get(
  '/current',
  requirePermission(Permission.ORG_READ),
  async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const organization = await orgService.getCurrentOrganization();
      res.json({ organization });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/current',
  requirePermission(Permission.ORG_UPDATE),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const input = updateOrganizationSchema.parse(req.body);
      const organization = await orgService.updateOrganization(input);
      res.json({ organization });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/current/logo',
  requirePermission(Permission.ORG_UPDATE),
  logoUpload.single('logo'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: { message: 'No file uploaded', code: 'VALIDATION_ERROR' } });
        return;
      }

      const logoUrl = buildUploadUrl('logos', req.file.filename);
      const organization = await orgService.updateOrganization({ logoUrl });
      res.json({ organization });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
