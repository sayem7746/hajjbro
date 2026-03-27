import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Public (stricter rate limit for auth endpoints)
router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);
router.post('/refresh', authRateLimiter, authController.refresh);
router.post('/logout', authRateLimiter, authController.logout);

// Protected (all require valid JWT)
router.get('/me', authMiddleware, authController.me);
router.patch('/fcm-token', authMiddleware, authController.updateFcmToken);

// Admin-only example (use requireRole after authMiddleware for role-gated routes)
// router.get('/admin/users', authMiddleware, requireRole('admin'), adminController.listUsers);

export default router;
