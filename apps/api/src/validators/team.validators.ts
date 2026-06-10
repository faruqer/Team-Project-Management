import { z } from 'zod';

export const invitationPreviewQuerySchema = z.object({
  token: z.string().min(1),
});

const inviteableRoles = [
  'ORGANIZATION_ADMIN',
  'PROJECT_MANAGER',
  'TEAM_MEMBER',
  'CLIENT',
] as const;

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(inviteableRoles),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(inviteableRoles),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  password: z.string().min(8).max(128),
});
