import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Public
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Protected (all require valid JWT)
router.get('/me', authMiddleware, authController.me);
router.patch('/fcm-token', authMiddleware, authController.updateFcmToken);

// Admin-only example (use requireRole after authMiddleware for role-gated routes)
// router.get('/admin/users', authMiddleware, requireRole('admin'), adminController.listUsers);

export default router;
