import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from './auth';
import { UnauthorizedError } from '../utils/errors';

export async function activeUserMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
        organizationId: req.user.organizationId,
      },
      select: { isActive: true },
    });

    if (!user?.isActive) {
      next(new UnauthorizedError('Your account has been deactivated'));
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
}
