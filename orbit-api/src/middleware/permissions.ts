import { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest } from './auth';
import { ForbiddenError } from '../utils/errors';
import { hasAllPermissions, hasAnyPermission, Permission } from '../lib/permissions';

export function requirePermission(...permissions: Permission[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user?.role) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }

    if (!hasAllPermissions(req.user.role, permissions)) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }

    next();
  };
}

export function requireAnyPermission(...permissions: Permission[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user?.role) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }

    if (!hasAnyPermission(req.user.role, permissions)) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }

    next();
  };
}

export function requireRoles(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user?.role || !roles.includes(req.user.role as UserRole)) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }

    next();
  };
}
