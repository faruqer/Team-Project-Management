import { z } from 'zod';

export const registerSchema = z.object({
  organizationName: z.string().min(2).max(100),
  organizationSlug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
});

export const loginSchema = z.object({
  organizationSlug: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  organizationSlug: z.string().min(3).max(50),
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  organizationSlug: z.string().min(3).max(50),
  password: z.string().min(8).max(128),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const verifyEmailQuerySchema = z.object({
  token: z.string().min(1),
  org: z.string().min(3).max(50),
});
