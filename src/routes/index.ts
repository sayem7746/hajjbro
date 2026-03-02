import { Router } from 'express';
import authRoutes from './authRoutes.js';
import healthRoutes from './healthRoutes.js';
import ritualRoutes from './ritualRoutes.js';
import duaRoutes from './duaRoutes.js';
import progressRoutes from './progressRoutes.js';
import checklistRoutes from './checklistRoutes.js';
import locationRoutes from './locationRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/rituals', ritualRoutes);
router.use('/duas', duaRoutes);
router.use('/progress', progressRoutes);
router.use('/checklists', checklistRoutes);
router.use('/locations', locationRoutes);

export default router;
