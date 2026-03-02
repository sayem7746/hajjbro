import { Router } from 'express';
import * as healthController from '../controllers/healthController.js';

const router = Router();

router.get('/', healthController.healthCheck);
router.get('/ready', healthController.readinessCheck);

export default router;
