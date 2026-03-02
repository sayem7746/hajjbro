import { Router } from 'express';
import * as progressController from '../controllers/progressController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/rituals', progressController.getMyProgress);
router.get('/rituals/summary', progressController.getSummary);
router.get('/rituals/percentage', progressController.getCompletionPercentage);
router.patch('/rituals/:ritualId', progressController.markRitualComplete);

export default router;
