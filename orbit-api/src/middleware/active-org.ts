import { OrganizationStatus } from '@prisma/client';
import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from './auth';
import { UnauthorizedError } from '../utils/errors';

export async function activeOrgMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    const org = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
      select: { status: true },
    });

    if (!org) {
      next(new UnauthorizedError('Organization not found'));
      return;
    }

    if (org.status === OrganizationStatus.SUSPENDED) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { isPlatformAdmin: true },
      });

      if (!user?.isPlatformAdmin) {
        next(new UnauthorizedError('Organization has been suspended'));
        return;
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}
