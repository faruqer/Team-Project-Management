import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { AuthTokenType, OrganizationStatus, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getTenantPrisma } from '../lib/tenant-prisma';
import { runWithTenantContextAsync } from '../lib/tenant-context';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../utils/errors';
import { parseExpiresIn, signAccessToken } from '../utils/jwt';
import { generateSecureToken, hashToken } from '../utils/tokens';
import { env } from '../config/env';
import { sendPasswordResetEmail, sendVerificationEmail } from './email.service';

const SALT_ROUNDS = 12;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  emailVerified: boolean;
  avatarUrl?: string | null;
  isPlatformAdmin: boolean;
}

async function syncPlatformAdmin(userId: string, email: string): Promise<boolean> {
  const shouldBeAdmin = env.PLATFORM_ADMIN_EMAILS.includes(email.toLowerCase());
  if (!shouldBeAdmin) return false;

  await prisma.user.update({
    where: { id: userId },
    data: { isPlatformAdmin: true },
  });
  return true;
}

function toAuthUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  isPlatformAdmin: boolean;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    organizationId: user.organizationId,
    emailVerified: user.emailVerified,
    avatarUrl: user.avatarUrl,
    isPlatformAdmin: user.isPlatformAdmin,
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function createTokenPair(
  user: { id: string; email: string; role: UserRole; organizationId: string },
  familyId?: string,
): Promise<AuthTokens> {
  const tokenFamilyId = familyId ?? uuidv4();
  const refreshToken = generateSecureToken();

  const accessToken = signAccessToken({
    sub: user.id,
    organizationId: user.organizationId,
    email: user.email,
    role: user.role,
  });

  const expiresAt = new Date(Date.now() + parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN));

  await runWithTenantContextAsync(
    { organizationId: user.organizationId, userId: user.id },
    async () => {
      const tenantPrisma = getTenantPrisma();
      await tenantPrisma.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(refreshToken),
          familyId: tokenFamilyId,
          expiresAt,
        } as Parameters<typeof tenantPrisma.refreshToken.create>[0]['data'],
      });
    },
  );

  return { accessToken, refreshToken };
}

export async function register(input: {
  organizationName: string;
  organizationSlug?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<{ user: AuthUser; tokens: AuthTokens }> {
  const slug = input.organizationSlug ?? slugify(input.organizationName);

  if (!slug || slug.length < 3) {
    throw new ValidationError('Organization slug must be at least 3 characters');
  }

  const existingOrg = await prisma.organization.findUnique({ where: { slug } });
  if (existingOrg) {
    throw new ConflictError('Organization slug already taken');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const organization = await prisma.organization.create({
    data: {
      name: input.organizationName,
      slug,
      users: {
        create: {
          email: input.email.toLowerCase(),
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          role: UserRole.SUPER_ADMIN,
        },
      },
    },
    include: { users: true },
  });

  const user = organization.users[0];

  const verificationToken = generateSecureToken();
  await prisma.authToken.create({
    data: {
      organizationId: organization.id,
      userId: user.id,
      tokenHash: hashToken(verificationToken),
      type: AuthTokenType.EMAIL_VERIFICATION,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  await sendVerificationEmail(user.email, verificationToken, organization.slug);

  const tokens = await createTokenPair({
    id: user.id,
    email: user.email,
    role: user.role,
    organizationId: organization.id,
  });

  const isPlatformAdmin = await syncPlatformAdmin(user.id, user.email);

  return {
    user: toAuthUser({ ...user, organizationId: organization.id, isPlatformAdmin: isPlatformAdmin || user.isPlatformAdmin }),
    tokens,
  };
}

export async function login(input: {
  organizationSlug: string;
  email: string;
  password: string;
}): Promise<{ user: AuthUser; tokens: AuthTokens }> {
  const organization = await prisma.organization.findUnique({
    where: { slug: input.organizationSlug },
  });

  if (!organization) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const user = await prisma.user.findUnique({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email: input.email.toLowerCase(),
      },
    },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  if (!user.isActive) {
    throw new UnauthorizedError('Your account has been deactivated');
  }

  const isPlatformAdmin = user.isPlatformAdmin || (await syncPlatformAdmin(user.id, user.email));

  if (organization.status === OrganizationStatus.SUSPENDED && !isPlatformAdmin) {
    throw new UnauthorizedError('Organization has been suspended');
  }

  const tokens = await createTokenPair({
    id: user.id,
    email: user.email,
    role: user.role,
    organizationId: organization.id,
  });

  return {
    user: toAuthUser({ ...user, organizationId: organization.id, isPlatformAdmin }),
    tokens,
  };
}

export async function logout(
  organizationId: string,
  userId: string,
  refreshToken?: string,
): Promise<void> {
  await runWithTenantContextAsync({ organizationId, userId }, async () => {
    const tenantPrisma = getTenantPrisma();

    if (refreshToken) {
      await tenantPrisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(refreshToken), userId },
        data: { revokedAt: new Date() },
      });
      return;
    }

    await tenantPrisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const tokenRecord = await prisma.refreshToken.findFirst({
    where: { tokenHash: hashToken(refreshToken) },
    include: { user: true },
  });

  if (!tokenRecord) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  if (tokenRecord.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { familyId: tokenRecord.familyId },
      data: { revokedAt: new Date() },
    });
    throw new UnauthorizedError('Refresh token reuse detected');
  }

  if (tokenRecord.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token expired');
  }

  if (!tokenRecord.user.isActive) {
    throw new UnauthorizedError('Your account has been deactivated');
  }

  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: { revokedAt: new Date() },
  });

  return createTokenPair(
    {
      id: tokenRecord.user.id,
      email: tokenRecord.user.email,
      role: tokenRecord.user.role,
      organizationId: tokenRecord.organizationId,
    },
    tokenRecord.familyId,
  );
}

export async function verifyEmail(token: string, organizationSlug: string): Promise<void> {
  const organization = await prisma.organization.findUnique({
    where: { slug: organizationSlug },
  });

  if (!organization) {
    throw new NotFoundError('Organization not found');
  }

  const authToken = await prisma.authToken.findFirst({
    where: {
      organizationId: organization.id,
      tokenHash: hashToken(token),
      type: AuthTokenType.EMAIL_VERIFICATION,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!authToken) {
    throw new ValidationError('Invalid or expired verification token');
  }

  await prisma.$transaction([
    prisma.authToken.update({
      where: { id: authToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: authToken.userId },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    }),
  ]);
}

export async function forgotPassword(organizationSlug: string, email: string): Promise<void> {
  const organization = await prisma.organization.findUnique({
    where: { slug: organizationSlug },
  });

  if (!organization) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email: email.toLowerCase(),
      },
    },
  });

  if (!user) {
    return;
  }

  const resetToken = generateSecureToken();

  await prisma.authToken.create({
    data: {
      organizationId: organization.id,
      userId: user.id,
      tokenHash: hashToken(resetToken),
      type: AuthTokenType.PASSWORD_RESET,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  await sendPasswordResetEmail(user.email, resetToken, organization.slug);
}

export async function resetPassword(
  token: string,
  organizationSlug: string,
  newPassword: string,
): Promise<void> {
  const organization = await prisma.organization.findUnique({
    where: { slug: organizationSlug },
  });

  if (!organization) {
    throw new NotFoundError('Organization not found');
  }

  const authToken = await prisma.authToken.findFirst({
    where: {
      organizationId: organization.id,
      tokenHash: hashToken(token),
      type: AuthTokenType.PASSWORD_RESET,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (!authToken) {
    throw new ValidationError('Invalid or expired reset token');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.$transaction([
    prisma.authToken.update({
      where: { id: authToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: authToken.userId },
      data: { passwordHash },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: authToken.userId },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export async function getCurrentUser(organizationId: string, userId: string): Promise<AuthUser> {
  return runWithTenantContextAsync({ organizationId, userId }, async () => {
    const tenantPrisma = getTenantPrisma();
    const user = await tenantPrisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return toAuthUser(user);
  });
}
