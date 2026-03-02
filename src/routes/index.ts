import { Router } from 'express';
import authRoutes from './authRoutes.js';
import healthRoutes from './healthRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Private routes: mount with authMiddleware (and optionally requireRole) so they are protected, e.g.:
// import { authMiddleware, requireRole } from '../middleware/index.js';
// router.use('/rituals', authMiddleware, ritualRoutes);
// router.use('/admin', authMiddleware, requireRole('admin'), adminRoutes);
// router.use('/checklists', authMiddleware, checklistRoutes);
// router.use('/notifications', authMiddleware, notificationRoutes);
// router.use('/contacts', authMiddleware, contactRoutes);
// router.use('/prayer-times', authMiddleware, prayerTimeRoutes);

export default router;
