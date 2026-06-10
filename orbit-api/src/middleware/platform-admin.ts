import { UserRole } from '@prisma/client';
import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from './auth';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';

export async function platformAdminMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    if (req.user.role !== UserRole.SUPER_ADMIN) {
      next(new ForbiddenError('Super Admin access required'));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { isPlatformAdmin: true },
    });

    if (!user?.isPlatformAdmin) {
      next(new ForbiddenError('Platform admin access required'));
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
}
