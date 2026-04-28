import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './user';
import projectRoutes from './projects';
import requirementRoutes from './requirements';

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/projects', projectRoutes);
router.use('/requirements', requirementRoutes);

export default router;
