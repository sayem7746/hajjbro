import { Router } from 'express';
import * as prayerTimesController from '../controllers/prayerTimesController.js';

const router = Router();

// Today's prayer times by city (location slug). Cached daily; Saudi timezone.
router.get('/today', prayerTimesController.getToday);

export default router;
