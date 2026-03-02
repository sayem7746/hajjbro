import { Router } from 'express';
import * as ritualController from '../controllers/ritualController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

// Public: paginated list with language filter (no auth)
router.get('/', ritualController.listPublic);

// Admin-only (below)
const admin = Router();
admin.use(authMiddleware, requireRole('admin'));

admin.get('/', ritualController.listAdmin);
admin.post('/reorder', ritualController.reorder);
admin.get('/:id', ritualController.getByIdAdmin);
admin.post('/', ritualController.create);
admin.patch('/:id', ritualController.update);
admin.delete('/:id', ritualController.remove);

router.use('/admin', admin);

export default router;
