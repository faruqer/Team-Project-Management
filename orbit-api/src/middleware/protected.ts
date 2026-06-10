import { authMiddleware } from './auth';
import { tenantMiddleware } from './tenant';
import { activeUserMiddleware } from './active-user';
import { activeOrgMiddleware } from './active-org';

export const protectedMiddleware = [
  authMiddleware,
  tenantMiddleware,
  activeUserMiddleware,
  activeOrgMiddleware,
];
