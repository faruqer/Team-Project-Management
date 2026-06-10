import { Router, Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { AuthenticatedRequest } from '../middleware/auth';
import { protectedMiddleware } from '../middleware/protected';
import { authRateLimiter } from '../middleware/rate-limit';
import { doubleCsrfProtection, issueCsrfToken } from '../middleware/csrf';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailQuerySchema,
} from '../validators/auth.validators';

const router = Router();

const REFRESH_COOKIE = 'orbit_refresh_token';

function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}

router.get('/csrf-token', (req: Request, res: Response) => {
  const csrfToken = issueCsrfToken(req, res);
  res.json({ csrfToken });
});

router.post('/register', authRateLimiter, doubleCsrfProtection, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input);
    setRefreshCookie(res, result.tokens.refreshToken);
    res.status(201).json({
      user: result.user,
      accessToken: result.tokens.accessToken,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', authRateLimiter, doubleCsrfProtection, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    setRefreshCookie(res, result.tokens.refreshToken);
    res.json({
      user: result.user,
      accessToken: result.tokens.accessToken,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', ...protectedMiddleware, doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    await authService.logout(req.user!.organizationId, req.user!.id, refreshToken);
    clearRefreshCookie(res);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', authRateLimiter, doubleCsrfProtection, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken =
      (req.cookies?.[REFRESH_COOKIE] as string | undefined) ??
      refreshTokenSchema.parse(req.body).refreshToken;

    const tokens = await authService.refreshTokens(refreshToken);
    setRefreshCookie(res, tokens.refreshToken);
    res.json({ accessToken: tokens.accessToken });
  } catch (err) {
    next(err);
  }
});

router.get('/verify-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, org } = verifyEmailQuerySchema.parse(req.query);
    await authService.verifyEmail(token, org);
    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = forgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(input.organizationSlug, input.email);
    res.json({ message: 'If an account exists, a reset email has been sent' });
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(input.token, input.organizationSlug, input.password);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
});

router.get('/me', ...protectedMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getCurrentUser(req.user!.organizationId, req.user!.id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
