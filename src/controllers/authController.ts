import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService.js';
import { AppError } from '../middleware/errorHandler.js';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, name, phone } = req.body;
    if (!email || !password) {
      throw new AppError(400, 'Email and password are required');
    }
    const result = await authService.register({ email, password, name, phone });
    res.status(201).json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new AppError(400, 'Email and password are required');
    }
    const result = await authService.login({ email, password });
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }
    // Return minimal user info; full profile can be a separate endpoint
    res.json({
      success: true,
      data: { id: req.user.sub, email: req.user.email },
    });
  } catch (e) {
    next(e);
  }
}

export async function updateFcmToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    const { fcmToken } = req.body;
    await authService.updateFcmToken(req.user.sub, fcmToken ?? null);
    res.json({ success: true, message: 'FCM token updated' });
  } catch (e) {
    next(e);
  }
}
