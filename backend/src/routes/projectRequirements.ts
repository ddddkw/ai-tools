import { Router, Request, Response } from 'express';
import { requirementService } from '../services/RequirementService';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /projects/:projectId/requirements - List all requirements for a project
router.get('/:projectId/requirements', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { projectId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 9;
    const search = req.query.search as string;
    const status = req.query.status as string;

    // Verify project ownership
    const isOwner = await requirementService.checkProjectOwnership(projectId, userId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    const result = await requirementService.findAllByProject(
      projectId,
      page,
      limit,
      search,
      status
    );

    res.json(result);
  } catch (error) {
    console.error('Error listing requirements:', error);
    res.status(500).json({ error: 'Failed to list requirements' });
  }
});

// POST /projects/:projectId/requirements - Create a new requirement
router.post('/:projectId/requirements', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { projectId } = req.params;
    const { title, content, priority, tags } = req.body;

    // Verify project ownership
    const isOwner = await requirementService.checkProjectOwnership(projectId, userId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Requirement title is required' });
    }

    if (!content || !content.trim()) {
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

export default router;
