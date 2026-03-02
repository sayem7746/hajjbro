import { Router } from 'express';
import * as duaController from '../controllers/duaController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

// All routes require admin
router.use(authMiddleware, requireRole('admin'));

router.get('/', duaController.listAdmin);
router.post('/reorder', duaController.reorder);
router.get('/:id', duaController.getByIdAdmin);
router.post('/', duaController.create);
router.patch('/:id', duaController.update);
router.delete('/:id', duaController.remove);

export default router;
