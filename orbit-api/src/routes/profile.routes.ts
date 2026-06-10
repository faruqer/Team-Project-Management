import { Router, Response, NextFunction } from 'express';
import * as profileService from '../services/profile.service';
import { AuthenticatedRequest } from '../middleware/auth';
import { protectedMiddleware } from '../middleware/protected';
import { requirePermission } from '../middleware/permissions';
import { Permission } from '../lib/permissions';
import { changePasswordSchema, updateProfileSchema } from '../validators/profile.validators';
import { avatarUpload, buildUploadUrl } from '../lib/upload';

const router = Router();

router.use(...protectedMiddleware);

router.get(
  '/',
  requirePermission(Permission.PROFILE_READ),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const profile = await profileService.getProfile(req.user!.id);
      res.json({ profile });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/',
  requirePermission(Permission.PROFILE_UPDATE),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const input = updateProfileSchema.parse(req.body);
      const profile = await profileService.updateProfile(req.user!.id, input);
      res.json({ profile });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/avatar',
  requirePermission(Permission.PROFILE_UPDATE),
  avatarUpload.single('avatar'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: { message: 'No file uploaded', code: 'VALIDATION_ERROR' } });
        return;
      }

      const avatarUrl = buildUploadUrl('avatars', req.file.filename);
      const profile = await profileService.updateAvatar(req.user!.id, avatarUrl);
      res.json({ profile });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/change-password',
  requirePermission(Permission.PROFILE_UPDATE),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const input = changePasswordSchema.parse(req.body);
      await profileService.changePassword(
        req.user!.id,
        req.user!.organizationId,
        input.currentPassword,
        input.newPassword,
      );
      res.json({ message: 'Password changed successfully' });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
