import { OrganizationStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { NotFoundError } from '../utils/errors';

export interface AdminOrganization {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    users: number;
    projects: number;
    tasks: number;
  };
}

export async function listAllOrganizations(): Promise<AdminOrganization[]> {
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { users: true, projects: true, tasks: true },
      },
    },
  });

  return orgs.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    status: org.status,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
    _count: org._count,
  }));
}

export async function updateOrganizationStatus(
  id: string,
  status: OrganizationStatus,
): Promise<AdminOrganization> {
  const existing = await prisma.organization.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Organization not found');

  const org = await prisma.organization.update({
    where: { id },
    data: { status },
    include: {
      _count: {
        select: { users: true, projects: true, tasks: true },
      },
    },
  });

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    status: org.status,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
    _count: org._count,
  };
}
