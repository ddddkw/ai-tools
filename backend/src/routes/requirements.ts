import { Router, Request, Response } from 'express';
import { requirementService } from '../services/RequirementService';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /requirements/:id - Get a single requirement
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const requirement = await requirementService.findById(req.params.id);

    if (!requirement) {
      return res.status(404).json({ error: 'Requirement not found' });
    }

    res.json(requirement);
  } catch (error) {
    console.error('Error getting requirement:', error);
    res.status(500).json({ error: 'Failed to get requirement' });
  }
});

// PUT /requirements/:id - Update a requirement
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { title, content, priority, tags } = req.body;

    const requirement = await requirementService.update(req.params.id, {
      title: title?.trim(),
      content,
      priority,
      tags,
    });

    if (!requirement) {
      return res.status(404).json({ error: 'Requirement not found' });
    }

    res.json(requirement);
  } catch (error) {
    console.error('Error updating requirement:', error);
    res.status(500).json({ error: 'Failed to update requirement' });
  }
});

// DELETE /requirements/:id - Delete a requirement
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await requirementService.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Requirement not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting requirement:', error);
    res.status(500).json({ error: 'Failed to delete requirement' });
  }
});

export default router;
