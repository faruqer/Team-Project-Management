import { Router, Request, Response, NextFunction } from 'express';

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}
import { UserRole } from '@prisma/client';
import * as teamService from '../services/team.service';
import { AuthenticatedRequest } from '../middleware/auth';
import { protectedMiddleware } from '../middleware/protected';
import { requirePermission } from '../middleware/permissions';
import { Permission } from '../lib/permissions';
import {
  acceptInvitationSchema,
  invitationPreviewQuerySchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from '../validators/team.validators';
import { doubleCsrfProtection } from '../middleware/csrf';
import { authRateLimiter } from '../middleware/rate-limit';

const router = Router();

router.get('/invitations/preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = invitationPreviewQuerySchema.parse(req.query);
    const invitation = await teamService.previewInvitation(token);
    res.json({ invitation });
  } catch (err) {
    next(err);
  }
});

router.post('/invitations/accept', authRateLimiter, doubleCsrfProtection, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = acceptInvitationSchema.parse(req.body);
    const result = await teamService.acceptInvitation(input);

    res.cookie('orbit_refresh_token', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    res.status(201).json({
      user: result.user,
      accessToken: result.tokens.accessToken,
    });
  } catch (err) {
    next(err);
  }
});

router.use(...protectedMiddleware);

router.get(
  '/members',
  requirePermission(Permission.TEAM_LIST),
  async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const members = await teamService.listTeamMembers();
      res.json({ members });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/invitations',
  requirePermission(Permission.TEAM_INVITE),
  async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const invitations = await teamService.listInvitations();
      res.json({ invitations });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/invitations',
  requirePermission(Permission.TEAM_INVITE),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const input = inviteMemberSchema.parse(req.body);
      const invitation = await teamService.inviteMember({
        email: input.email,
        role: input.role as UserRole,
        invitedById: req.user!.id,
        inviterRole: req.user!.role as UserRole,
      });
      res.status(201).json({ invitation });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/invitations/:id',
  requirePermission(Permission.TEAM_INVITE),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await teamService.revokeInvitation(paramId(req.params.id));
      res.json({ message: 'Invitation revoked' });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/members/:userId/role',
  requirePermission(Permission.TEAM_MANAGE),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const input = updateMemberRoleSchema.parse(req.body);
      const member = await teamService.updateMemberRole({
        targetUserId: paramId(req.params.userId),
        role: input.role as UserRole,
        actorId: req.user!.id,
        actorRole: req.user!.role as UserRole,
      });
      res.json({ member });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/members/:userId/deactivate',
  requirePermission(Permission.TEAM_DEACTIVATE),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const member = await teamService.deactivateMember({
        targetUserId: paramId(req.params.userId),
        actorId: req.user!.id,
        actorRole: req.user!.role as UserRole,
      });
      res.json({ member });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/members/:userId/reactivate',
  requirePermission(Permission.TEAM_DEACTIVATE),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const member = await teamService.reactivateMember(paramId(req.params.userId));
      res.json({ member });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
