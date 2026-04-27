import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { authController } from '../controllers/AuthController';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Update profile
router.put('/me', (req, res, next) => authController.updateProfile(req, res, next));

// Change password
router.post('/me/change-password', (req, res, next) => authController.changePassword(req, res, next));

// Set AI provider
router.put('/me/ai-provider', async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const { aiProvider } = req.body;
    
    if (!aiProvider || !['openai', 'claude'].includes(aiProvider)) {
      return res.status(400).json({ error: 'Invalid AI provider. Must be openai or claude' });
    }
    
    const user = await authController.updateProfile(req, res, next);
    res.json({ message: 'AI provider updated', user });
  } catch (error) {
    next(error);
  }
});

export default router;
