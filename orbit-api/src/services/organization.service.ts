import { OrgTheme } from '@prisma/client';
import { getTenantPrisma } from '../lib/tenant-prisma';
import { NotFoundError } from '../utils/errors';

export interface OrganizationDto {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  timezone: string;
  currency: string;
  theme: OrgTheme;
  createdAt: Date;
  updatedAt: Date;
}

function toDto(org: {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  timezone: string;
  currency: string;
  theme: OrgTheme;
  createdAt: Date;
  updatedAt: Date;
}): OrganizationDto {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logoUrl: org.logoUrl,
    timezone: org.timezone,
    currency: org.currency,
    theme: org.theme,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
  };
}

export async function getCurrentOrganization(): Promise<OrganizationDto> {
  const tenantPrisma = getTenantPrisma();
  const org = await tenantPrisma.organization.findFirst();

  if (!org) {
    throw new NotFoundError('Organization not found');
  }

  return toDto(org);
}

export async function updateOrganization(input: {
  name?: string;
  timezone?: string;
  currency?: string;
  theme?: OrgTheme;
  logoUrl?: string | null;
}): Promise<OrganizationDto> {
  const tenantPrisma = getTenantPrisma();
  const existing = await tenantPrisma.organization.findFirst();

  if (!existing) {
    throw new NotFoundError('Organization not found');
  }

  const org = await tenantPrisma.organization.update({
    where: { id: existing.id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.timezone !== undefined && { timezone: input.timezone }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.theme !== undefined && { theme: input.theme }),
      ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
    },
  });

  return toDto(org);
}
