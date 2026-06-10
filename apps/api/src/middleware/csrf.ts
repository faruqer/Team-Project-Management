import { CookieOptions, Request, Response } from 'express';
import { doubleCsrf } from 'csrf-csrf';
import { env } from '../config/env';

const CSRF_COOKIE = 'orbit_csrf_token';

export const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => env.JWT_ACCESS_SECRET,
  getSessionIdentifier: (req) =>
    (req.cookies?.orbit_refresh_token as string | undefined) ??
    req.ip ??
    'anonymous',
  cookieName: CSRF_COOKIE,
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
  } satisfies CookieOptions,
  getTokenFromRequest: (req: Request) => req.headers['x-csrf-token'] as string | undefined,
});

export function issueCsrfToken(req: Request, res: Response): string {
  return generateToken(req, res);
}
