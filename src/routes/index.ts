import { Router } from 'express';
import authRoutes from './authRoutes.js';
import healthRoutes from './healthRoutes.js';
import ritualRoutes from './ritualRoutes.js';
import duaRoutes from './duaRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/rituals', ritualRoutes);
router.use('/duas', duaRoutes);

export default router;
