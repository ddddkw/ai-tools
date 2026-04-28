import { Router, Request, Response } from 'express';
import { projectService } from '../services/ProjectService';
import { requirementService } from '../services/RequirementService';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Nested requirements routes (before auth middleware)
router.get('/:projectId/requirements', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { projectId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 9;
    const search = req.query.search as string;
    const status = req.query.status as string;

    const isOwner = await requirementService.checkProjectOwnership(projectId, userId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    const result = await requirementService.findAllByProject(projectId, page, limit, search, status);
    res.json(result);
  } catch (error) {
    console.error('Error listing requirements:', error);
    res.status(500).json({ error: 'Failed to list requirements' });
  }
});

router.post('/:projectId/requirements', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { projectId } = req.params;
    const { title, content, priority, tags } = req.body;

    const isOwner = await requirementService.checkProjectOwnership(projectId, userId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    if (!title?.trim()) {
      return res.status(400).json({ error: 'Requirement title is required' });
    }
    if (!content?.trim()) {
      return res.status(400).json({ error: 'Requirement content is required' });
    }

    const requirement = await requirementService.create(projectId, {
      title: title.trim(),
      content: content.trim(),
      priority,
      tags,
    });

    res.status(201).json(requirement);
  } catch (error) {
    console.error('Error creating requirement:', error);
    res.status(500).json({ error: 'Failed to create requirement' });
  }
});

// Apply auth middleware to all project routes
router.use(authMiddleware);

// GET /projects - List all projects for current user
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 9, 100);
    const search = req.query.search as string;

    const result = await projectService.findAllByUser(userId, page, limit, search);
    res.json(result);
  } catch (error) {
    console.error('Error listing projects:', error);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// GET /projects/:id - Get a single project
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const project = await projectService.findById(req.params.id, userId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error getting project:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

// POST /projects - Create a new project
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { name, description, github_repo, github_branch } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const project = await projectService.create(userId, {
      name: name.trim(),
      description,
      github_repo,
      github_branch,
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// PUT /projects/:id - Update a project
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { name, description, github_repo, github_branch } = req.body;

    const project = await projectService.update(req.params.id, userId, {
      name: name?.trim(),
      description,
      github_repo,
      github_branch,
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /projects/:id - Delete a project
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const deleted = await projectService.delete(req.params.id, userId);

    if (!deleted) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
