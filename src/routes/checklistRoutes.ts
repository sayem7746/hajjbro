import { Router } from 'express';
import * as checklistController from '../controllers/checklistController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

// Public: template list (all items grouped by category, no completion)
router.get('/', checklistController.listTemplate);

// User: my checklist (grouped by category) and progress
router.get('/me', authMiddleware, checklistController.listMine);
router.get('/me/summary', authMiddleware, checklistController.getSummary);
router.patch('/:id', authMiddleware, checklistController.markDone);

// Admin: CRUD checklist items
const admin = Router();
admin.use(authMiddleware, requireRole('admin'));

admin.get('/', checklistController.listAdmin);
admin.get('/:id', checklistController.getByIdAdmin);
admin.post('/', checklistController.create);
admin.patch('/:id', checklistController.update);
admin.delete('/:id', checklistController.remove);

router.use('/admin', admin);

export default router;
