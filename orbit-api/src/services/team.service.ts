import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getTenantPrisma } from '../lib/tenant-prisma';
import { canAssignRole } from '../lib/permissions';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../utils/errors';
import { generateSecureToken, hashToken } from '../utils/tokens';
import { sendInvitationEmail } from './email.service';
import { createTokenPair, AuthTokens } from './auth.service';
import * as events from './events.service';

const SALT_ROUNDS = 12;
const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export interface TeamMemberDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
}

export interface InvitationDto {
  id: string;
  email: string;
  role: UserRole;
  expiresAt: Date;
  createdAt: Date;
  invitedBy: { id: string; firstName: string; lastName: string };
}

export async function listTeamMembers(): Promise<TeamMemberDto[]> {
  const tenantPrisma = getTenantPrisma();
  const users = await tenantPrisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  return users;
}

export async function listInvitations(): Promise<InvitationDto[]> {
  const tenantPrisma = getTenantPrisma();
  const invitations = await tenantPrisma.invitation.findMany({
    where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    include: {
      invitedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return invitations.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    expiresAt: inv.expiresAt,
    createdAt: inv.createdAt,
    invitedBy: inv.invitedBy,
  }));
}

export async function inviteMember(input: {
  email: string;
  role: UserRole;
  invitedById: string;
  inviterRole: UserRole;
}): Promise<InvitationDto> {
  if (!canAssignRole(input.inviterRole, input.role)) {
    throw new ForbiddenError('You cannot assign this role');
  }

  if (input.role === UserRole.SUPER_ADMIN) {
    throw new ForbiddenError('Cannot invite users as Super Admin');
  }

  const email = input.email.toLowerCase();
  const tenantPrisma = getTenantPrisma();

  const existingUser = await tenantPrisma.user.findFirst({ where: { email } });
  if (existingUser) {
    throw new ConflictError('User is already a member of this organization');
  }

  const existingInvite = await tenantPrisma.invitation.findFirst({
    where: {
      email,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (existingInvite) {
    throw new ConflictError('A pending invitation already exists for this email');
  }

  const rawToken = generateSecureToken();

  const invitation = await tenantPrisma.invitation.create({
    data: {
      email,
      role: input.role,
      tokenHash: hashToken(rawToken),
      invitedById: input.invitedById,
      expiresAt: new Date(Date.now() + INVITE_EXPIRY_MS),
    } as Parameters<typeof tenantPrisma.invitation.create>[0]['data'],
    include: {
      invitedBy: { select: { id: true, firstName: true, lastName: true } },
      organization: { select: { name: true, slug: true } },
    },
  });

  const inv = invitation as typeof invitation & {
    organization: { name: string; slug: string };
    invitedBy: { id: string; firstName: string; lastName: string };
  };

  await sendInvitationEmail(
    email,
    rawToken,
    inv.organization.slug,
    inv.organization.name,
    input.role,
  );

  events.onUserInvited({
    email: inv.email,
    role: inv.role,
    inviterId: input.invitedById,
    inviterName: `${inv.invitedBy.firstName} ${inv.invitedBy.lastName}`,
  });

  return {
    id: inv.id,
    email: inv.email,
    role: inv.role,
    expiresAt: inv.expiresAt,
    createdAt: inv.createdAt,
    invitedBy: inv.invitedBy,
  };
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  const tenantPrisma = getTenantPrisma();
  const invitation = await tenantPrisma.invitation.findFirst({
    where: { id: invitationId, acceptedAt: null, revokedAt: null },
  });

  if (!invitation) {
    throw new NotFoundError('Invitation not found or already processed');
  }

  await tenantPrisma.invitation.update({
    where: { id: invitationId },
    data: { revokedAt: new Date() },
  });
}

export async function previewInvitation(token: string): Promise<{
  email: string;
  role: UserRole;
  organizationName: string;
  organizationSlug: string;
  expiresAt: Date;
  status: 'valid' | 'expired' | 'revoked' | 'accepted';
}> {
  const invitation = await prisma.invitation.findFirst({
    where: { tokenHash: hashToken(token) },
    include: { organization: { select: { name: true, slug: true } } },
  });

  if (!invitation) {
    throw new NotFoundError('Invitation not found');
  }

  let status: 'valid' | 'expired' | 'revoked' | 'accepted' = 'valid';
  if (invitation.acceptedAt) status = 'accepted';
  else if (invitation.revokedAt) status = 'revoked';
  else if (invitation.expiresAt < new Date()) status = 'expired';

  return {
    email: invitation.email,
    role: invitation.role,
    organizationName: invitation.organization.name,
    organizationSlug: invitation.organization.slug,
    expiresAt: invitation.expiresAt,
    status,
  };
}

export async function acceptInvitation(input: {
  token: string;
  firstName: string;
  lastName: string;
  password: string;
}): Promise<{ user: TeamMemberDto; tokens: AuthTokens }> {
  const invitation = await prisma.invitation.findFirst({
    where: { tokenHash: hashToken(input.token) },
    include: { organization: true },
  });

  if (!invitation) {
    throw new ValidationError('Invalid invitation token');
  }

  if (invitation.acceptedAt) {
    throw new ConflictError('This invitation has already been accepted');
  }

  if (invitation.revokedAt) {
    throw new ValidationError('This invitation has been revoked');
  }

  if (invitation.expiresAt < new Date()) {
    throw new ValidationError('This invitation has expired');
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      organizationId_email: {
        organizationId: invitation.organizationId,
        email: invitation.email,
      },
    },
  });

  if (existingUser) {
    throw new ConflictError('You are already a member of this organization');
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.$transaction(async (tx) => {
    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    return tx.user.create({
      data: {
        organizationId: invitation.organizationId,
        email: invitation.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: invitation.role,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
  });

  const tokens = await createTokenPair({
    id: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    },
    tokens,
  };
}

export async function updateMemberRole(input: {
  targetUserId: string;
  role: UserRole;
  actorId: string;
  actorRole: UserRole;
}): Promise<TeamMemberDto> {
  if (input.targetUserId === input.actorId) {
    throw new ForbiddenError('You cannot change your own role');
  }

  if (!canAssignRole(input.actorRole, input.role)) {
    throw new ForbiddenError('You cannot assign this role');
  }

  if (input.role === UserRole.SUPER_ADMIN) {
    throw new ForbiddenError('Cannot assign Super Admin role');
  }

  const tenantPrisma = getTenantPrisma();
  const target = await tenantPrisma.user.findUnique({ where: { id: input.targetUserId } });

  if (!target) {
    throw new NotFoundError('User not found');
  }

  if (target.role === UserRole.SUPER_ADMIN) {
    throw new ForbiddenError('Cannot modify Super Admin role');
  }

  const updated = await tenantPrisma.user.update({
    where: { id: input.targetUserId },
    data: { role: input.role },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  return updated;
}

export async function deactivateMember(input: {
  targetUserId: string;
  actorId: string;
  actorRole: UserRole;
}): Promise<TeamMemberDto> {
  if (input.targetUserId === input.actorId) {
    throw new ForbiddenError('You cannot deactivate yourself');
  }

  const tenantPrisma = getTenantPrisma();
  const target = await tenantPrisma.user.findUnique({ where: { id: input.targetUserId } });

  if (!target) {
    throw new NotFoundError('User not found');
  }

  if (target.role === UserRole.SUPER_ADMIN) {
    throw new ForbiddenError('Cannot deactivate Super Admin');
  }

  if (!target.isActive) {
    throw new ConflictError('User is already deactivated');
  }

  const updated = await tenantPrisma.user.update({
    where: { id: input.targetUserId },
    data: { isActive: false, deactivatedAt: new Date() },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
    },
  });

  await tenantPrisma.refreshToken.updateMany({
    where: { userId: input.targetUserId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return updated;
}

export async function reactivateMember(targetUserId: string): Promise<TeamMemberDto> {
  const tenantPrisma = getTenantPrisma();
  const target = await tenantPrisma.user.findUnique({ where: { id: targetUserId } });

  if (!target) {
    throw new NotFoundError('User not found');
  }

  if (target.isActive) {
    throw new ConflictError('User is already active');
  }

  return tenantPrisma.user.update({
    where: { id: targetUserId },
    data: { isActive: true, deactivatedAt: null },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
    },
  });
}
