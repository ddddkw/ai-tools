import { Request, Response, NextFunction } from 'express';
import { projectService } from '../services/ProjectService';

export class ProjectController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { name, description, github_repo, github_branch } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({ error: 'Project name is required' });
        return;
      }

      const project = await projectService.create(userId, {
        name: name.trim(),
        description,
        github_repo,
        github_branch,
      });

      res.status(201).json(project);
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const search = req.query.search as string;

      const result = await projectService.findAllByUser(userId, page, limit, search);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      const project = await projectService.findById(id, userId);

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (project.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      res.json(project);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      const { name, description, github_repo, github_branch } = req.body;

      const existing = await projectService.findById(id, userId);
      if (!existing) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (existing.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const project = await projectService.update(id, userId, {
        name: name?.trim(),
        description,
        github_repo,
        github_branch,
      });

      res.json(project);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      const existing = await projectService.findById(id, userId);
      if (!existing) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (existing.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      await projectService.delete(id, userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
