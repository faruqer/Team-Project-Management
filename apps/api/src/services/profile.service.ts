import bcrypt from 'bcryptjs';
import { getTenantPrisma } from '../lib/tenant-prisma';
import { NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors';
import { prisma } from '../lib/prisma';

const SALT_ROUNDS = 12;

export interface ProfileDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
  emailVerified: boolean;
  organizationId: string;
  createdAt: Date;
}

export async function getProfile(userId: string): Promise<ProfileDto> {
  const tenantPrisma = getTenantPrisma();
  const user = await tenantPrisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new NotFoundError('Profile not found');
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    role: user.role,
    emailVerified: user.emailVerified,
    organizationId: user.organizationId,
    createdAt: user.createdAt,
  };
}

export async function updateProfile(
  userId: string,
  input: { firstName?: string; lastName?: string; bio?: string | null },
): Promise<ProfileDto> {
  const tenantPrisma = getTenantPrisma();
  const user = await tenantPrisma.user.update({
    where: { id: userId },
    data: {
      ...(input.firstName !== undefined && { firstName: input.firstName }),
      ...(input.lastName !== undefined && { lastName: input.lastName }),
      ...(input.bio !== undefined && { bio: input.bio }),
    },
  });

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    role: user.role,
    emailVerified: user.emailVerified,
    organizationId: user.organizationId,
    createdAt: user.createdAt,
  };
}

export async function updateAvatar(userId: string, avatarUrl: string): Promise<ProfileDto> {
  const tenantPrisma = getTenantPrisma();
  const user = await tenantPrisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
  });

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    role: user.role,
    emailVerified: user.emailVerified,
    organizationId: user.organizationId,
    createdAt: user.createdAt,
  };
}

export async function changePassword(
  userId: string,
  organizationId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId, organizationId },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  if (currentPassword === newPassword) {
    throw new ValidationError('New password must be different from current password');
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
