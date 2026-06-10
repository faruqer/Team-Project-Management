import { getTenantPrisma } from '../lib/tenant-prisma';
import { sanitizeText } from '../lib/sanitize';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { getTask } from './task.service';
import { buildUploadUrl } from '../lib/upload';

const authorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
};

export async function listTaskComments(taskId: string) {
  await getTask(taskId);
  const tenantPrisma = getTenantPrisma();

  const comments = await tenantPrisma.taskComment.findMany({
    where: { taskId },
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: authorSelect },
      attachments: true,
    },
  });

  return buildCommentTree(comments);
}

interface CommentRow {
  id: string;
  taskId: string;
  authorId: string;
  parentId: string | null;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
  };
  attachments: {
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    createdAt: Date;
  }[];
}

interface CommentNode extends CommentRow {
  replies: CommentNode[];
}

function buildCommentTree(comments: CommentRow[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const c of comments) {
    map.set(c.id, { ...c, replies: [] });
  }

  for (const c of comments) {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function createComment(
  taskId: string,
  authorId: string,
  input: { body: string; parentId?: string | null },
  files?: Express.Multer.File[],
) {
  await getTask(taskId);
  const tenantPrisma = getTenantPrisma();

  if (input.parentId) {
    const parent = await tenantPrisma.taskComment.findFirst({
      where: { id: input.parentId, taskId },
    });
    if (!parent) throw new NotFoundError('Parent comment not found');
  }

  const comment = await tenantPrisma.taskComment.create({
    data: {
      taskId,
      authorId,
      body: sanitizeText(input.body),
      parentId: input.parentId ?? null,
      attachments: files?.length
        ? {
            create: files.map((f) => ({
              fileName: f.originalname,
              fileUrl: buildUploadUrl('attachments', f.filename),
              fileSize: f.size,
              mimeType: f.mimetype,
            })),
          }
        : undefined,
    } as Parameters<typeof tenantPrisma.taskComment.create>[0]['data'],
    include: {
      author: { select: authorSelect },
      attachments: true,
    },
  });

  return { ...comment, replies: [] };
}

export async function updateComment(id: string, authorId: string, body: string) {
  const tenantPrisma = getTenantPrisma();
  const comment = await tenantPrisma.taskComment.findUnique({ where: { id } });

  if (!comment) throw new NotFoundError('Comment not found');
  if (comment.authorId !== authorId) throw new ForbiddenError('You can only edit your own comments');

  return tenantPrisma.taskComment.update({
    where: { id },
    data: { body: sanitizeText(body) },
    include: {
      author: { select: authorSelect },
      attachments: true,
    },
  });
}

export async function deleteComment(id: string, authorId: string, isAdmin: boolean) {
  const tenantPrisma = getTenantPrisma();
  const comment = await tenantPrisma.taskComment.findUnique({ where: { id } });

  if (!comment) throw new NotFoundError('Comment not found');
  if (comment.authorId !== authorId && !isAdmin) {
    throw new ForbiddenError('You can only delete your own comments');
  }

  await tenantPrisma.taskComment.delete({ where: { id } });
}

export async function searchMentionableUsers(taskId: string, query: string) {
  const task = await getTask(taskId);
  const tenantPrisma = getTenantPrisma();

  const members = await tenantPrisma.projectMember.findMany({
    where: { projectId: task.projectId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });

  const q = query.toLowerCase();
  return members
    .map((m) => m.user)
    .filter(
      (u) =>
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    )
    .slice(0, 10);
}
