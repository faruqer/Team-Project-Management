import { config } from 'dotenv';
import { resolve } from 'path';
import { z } from 'zod';

config({ path: resolve(__dirname, '../../../../.env') });
config({ path: resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().default(4000),
  API_URL: z.string().url().default('http://localhost:4000'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('Orbit <noreply@orbit.app>'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  PLATFORM_ADMIN_EMAILS: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(',')
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean)
        : [],
    ),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
