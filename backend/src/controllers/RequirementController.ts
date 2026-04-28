import { Request, Response, NextFunction } from 'express';
import { requirementService } from '../services/RequirementService';
import { projectService } from '../services/ProjectService';

export class RequirementController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { projectId } = req.params;
      const { title, content, priority, tags } = req.body;

      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        res.status(400).json({ error: 'Title is required' });
        return;
      }

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        res.status(400).json({ error: 'Content is required' });
        return;
      }

      const project = await projectService.findById(projectId, userId);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (project.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const requirement = await requirementService.create(projectId, {
        title: title.trim(),
        content: content.trim(),
        priority,
        tags,
      });

      res.status(201).json(requirement);
    } catch (error) {
      next(error);
    }
  }

  async listByProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { projectId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const search = req.query.search as string;
      const status = req.query.status as string;

      const project = await projectService.findById(projectId, userId);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (project.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const result = await requirementService.findAllByProject(projectId, page, limit, search, status);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      const requirement = await requirementService.findByIdWithProject(id);

      if (!requirement) {
        res.status(404).json({ error: 'Requirement not found' });
        return;
      }

      if (requirement.project_user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const { project_user_id, ...result } = requirement;
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      const { title, content, priority, tags } = req.body;

      const requirement = await requirementService.findByIdWithProject(id);

      if (!requirement) {
        res.status(404).json({ error: 'Requirement not found' });
        return;
      }

      if (requirement.project_user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const updated = await requirementService.update(id, {
        title: title?.trim(),
        content: content?.trim(),
        priority,
        tags,
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      const requirement = await requirementService.findByIdWithProject(id);

      if (!requirement) {
        res.status(404).json({ error: 'Requirement not found' });
        return;
      }

      if (requirement.project_user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      await requirementService.delete(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const requirementController = new RequirementController();
