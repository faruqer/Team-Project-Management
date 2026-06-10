import { Router, Response, NextFunction } from 'express';
import { TaskPriority, TaskStatus } from '@prisma/client';
import * as taskService from '../services/task.service';
import * as commentService from '../services/comment.service';
import { AuthenticatedRequest } from '../middleware/auth';
import { protectedMiddleware } from '../middleware/protected';
import { requirePermission } from '../middleware/permissions';
import { Permission, hasPermission } from '../lib/permissions';
import { UserRole } from '@prisma/client';
import {
  createTaskSchema,
  moveTaskSchema,
  updateTaskSchema,
} from '../validators/task.validators';
import {
  createCommentSchema,
  updateCommentSchema,
} from '../validators/comment.validators';
import { attachmentUpload } from '../lib/upload';

const router = Router();

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

router.use(...protectedMiddleware);

router.get(
  '/project/:projectId',
  requirePermission(Permission.TASK_LIST),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tasks = await taskService.listProjectTasks(paramId(req.params.projectId));
      res.json({ tasks });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/project/:projectId',
  requirePermission(Permission.TASK_CREATE),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const input = createTaskSchema.parse(req.body);
      const task = await taskService.createTask(paramId(req.params.projectId), {
        ...input,
        status: input.status as TaskStatus | undefined,
        priority: input.priority as TaskPriority | undefined,
      });
      res.status(201).json({ task });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/:id',
  requirePermission(Permission.TASK_LIST),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const task = await taskService.getTask(paramId(req.params.id));
      res.json({ task });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/:id',
  requirePermission(Permission.TASK_UPDATE),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const input = updateTaskSchema.parse(req.body);
      const task = await taskService.updateTask(paramId(req.params.id), {
        ...input,
        status: input.status as TaskStatus | undefined,
        priority: input.priority as TaskPriority | undefined,
      });
      res.json({ task });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/:id/move',
  requirePermission(Permission.TASK_UPDATE),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const input = moveTaskSchema.parse(req.body);
      const task = await taskService.moveTask(paramId(req.params.id), {
        status: input.status as TaskStatus,
        position: input.position,
      });
      res.json({ task });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/:id',
  requirePermission(Permission.TASK_DELETE),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await taskService.deleteTask(paramId(req.params.id));
      res.json({ message: 'Task deleted' });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/:taskId/comments',
  requirePermission(Permission.COMMENT_LIST),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const comments = await commentService.listTaskComments(paramId(req.params.taskId));
      res.json({ comments });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/:taskId/comments',
  requirePermission(Permission.COMMENT_CREATE),
  attachmentUpload.array('attachments', 5),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const body = {
        ...req.body,
        parentId: req.body.parentId || null,
      };
      const input = createCommentSchema.parse(body);
      const comment = await commentService.createComment(
        paramId(req.params.taskId),
        req.user!.id,
        input,
        req.files as Express.Multer.File[] | undefined,
      );
      res.status(201).json({ comment });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/:taskId/mentions',
  requirePermission(Permission.COMMENT_CREATE),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const q = (req.query.q as string) ?? '';
      const users = await commentService.searchMentionableUsers(
        paramId(req.params.taskId),
        q,
      );
      res.json({ users });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/comments/:id',
  requirePermission(Permission.COMMENT_UPDATE),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const input = updateCommentSchema.parse(req.body);
      const comment = await commentService.updateComment(
        paramId(req.params.id),
        req.user!.id,
        input.body,
      );
      res.json({ comment });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/comments/:id',
  requirePermission(Permission.COMMENT_DELETE),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const isAdmin = hasPermission(req.user!.role as UserRole, Permission.PROJECT_DELETE);
      await commentService.deleteComment(paramId(req.params.id), req.user!.id, isAdmin);
      res.json({ message: 'Comment deleted' });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
