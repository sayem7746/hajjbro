import { Router } from 'express';
import authRoutes from './authRoutes.js';
import healthRoutes from './healthRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Mount more route modules here, e.g.:
// router.use('/rituals', ritualRoutes);
// router.use('/duas', duaRoutes);
// router.use('/locations', locationRoutes);
// router.use('/checklists', checklistRoutes);
// router.use('/notifications', notificationRoutes);
// router.use('/contacts', contactRoutes);
// router.use('/prayer-times', prayerTimeRoutes);

export default router;
