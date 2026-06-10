import { Response, NextFunction } from 'express';
import { bindTenantContext } from '../lib/tenant-context';
import { AuthenticatedRequest } from './auth';
import { UnauthorizedError } from '../utils/errors';

export function tenantMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user?.organizationId || !req.user?.id) {
    next(new UnauthorizedError('Tenant context could not be established'));
    return;
  }

  bindTenantContext({
    organizationId: req.user.organizationId,
    userId: req.user.id,
  });

  next();
}
