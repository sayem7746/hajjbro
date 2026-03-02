import { Router } from 'express';
import * as notificationScheduleController from '../controllers/notificationScheduleController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.post('/scheduled', notificationScheduleController.createScheduled);
router.get('/scheduled', notificationScheduleController.listScheduled);
router.delete('/scheduled/:id', notificationScheduleController.cancelScheduled);

export default router;
