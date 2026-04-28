import { Router, Request, Response } from 'express';
import { analysisService } from '../services/AnalysisService';
import { requirementService } from '../services/RequirementService';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// POST /api/requirements/:id/analyze - Trigger AI analysis
router.post('/requirements/:id/analyze', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    // Check requirement ownership
    const requirement = await requirementService.findByIdWithProject(id);
    if (!requirement) {
      return res.status(404).json({ error: 'Requirement not found' });
    }
    if (requirement.project_user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Run analysis (async, long-running)
    const analysis = await analysisService.analyzeRequirement(id);
    res.status(201).json(analysis);
  } catch (error: any) {
    console.error('Error running analysis:', error);
    res.status(500).json({ error: error.message || 'Failed to run analysis' });
  }
});

// GET /api/requirements/:id/analysis - Get analysis result
router.get('/requirements/:id/analysis', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    // Check requirement ownership
    const requirement = await requirementService.findByIdWithProject(id);
    if (!requirement) {
      return res.status(404).json({ error: 'Requirement not found' });
    }
    if (requirement.project_user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await analysisService.findByRequirement(id);
    if (!result) {
      return res.status(404).json({ error: 'No analysis found' });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error fetching analysis:', error);
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
});

export default router;
