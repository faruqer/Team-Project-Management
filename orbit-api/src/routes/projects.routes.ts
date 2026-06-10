import { Router, Response, NextFunction } from 'express';
import { ProjectStatus } from '@prisma/client';
import * as projectService from '../services/project.service';
import { AuthenticatedRequest } from '../middleware/auth';
import { protectedMiddleware } from '../middleware/protected';
import { requirePermission } from '../middleware/permissions';
import { Permission } from '../lib/permissions';
import {
  createProjectSchema,
  setProjectMembersSchema,
  updateProjectSchema,
} from '../validators/project.validators';

const router = Router();

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

router.use(...protectedMiddleware);

router.get(
  '/',
  requirePermission(Permission.PROJECT_LIST),
  async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const projects = await projectService.listProjects();
      res.json({ projects });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/',
  requirePermission(Permission.PROJECT_CREATE),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const input = createProjectSchema.parse(req.body);
      const project = await projectService.createProject({
        ...input,
        status: input.status as ProjectStatus | undefined,
        creatorId: req.user!.id,
      });
      res.status(201).json({ project });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  '/:id',
  requirePermission(Permission.PROJECT_LIST),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const project = await projectService.getProject(paramId(req.params.id));
      res.json({ project });
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/:id',
  requirePermission(Permission.PROJECT_UPDATE),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const input = updateProjectSchema.parse(req.body);
      const project = await projectService.updateProject(paramId(req.params.id), {
        ...input,
        status: input.status as ProjectStatus | undefined,
      });
      res.json({ project });
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/:id',
  requirePermission(Permission.PROJECT_DELETE),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await projectService.deleteProject(paramId(req.params.id));
      res.json({ message: 'Project deleted' });
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  '/:id/members',
  requirePermission(Permission.PROJECT_MANAGE_MEMBERS),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const input = setProjectMembersSchema.parse(req.body);
      const project = await projectService.setProjectMembers(
        paramId(req.params.id),
        input.memberIds,
      );
      res.json({ project });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
