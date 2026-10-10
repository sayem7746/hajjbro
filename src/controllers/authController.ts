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

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = req.body?.refreshToken ?? req.headers['x-refresh-token'];
    const result = await authService.refresh(refreshToken);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = req.body?.refreshToken ?? req.headers['x-refresh-token'];
    await authService.logout(refreshToken ?? null);
    res.json({ success: true, message: 'Logged out' });
  } catch (e) {
    next(e);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'Not authenticated');
    }
    const profile = await authService.getProfile(req.user.sub);
    res.json({ success: true, data: profile });
  } catch (e) {
    next(e);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    const { name, phone } = req.body ?? {};
    if (name === undefined && phone === undefined) {
      throw new AppError(400, 'Provide name and/or phone to update');
    }
    const profile = await authService.updateProfile(req.user.sub, { name, phone });
    res.json({ success: true, data: profile });
  } catch (e) {
    next(e);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    const { currentPassword, newPassword } = req.body ?? {};
    await authService.changePassword(req.user.sub, currentPassword, newPassword);
    res.json({ success: true, message: 'Password updated. Please sign in again.' });
  } catch (e) {
    next(e);
  }
}

export async function deleteMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    const { password } = req.body ?? {};
    await authService.deleteAccount(req.user.sub, password);
    res.json({ success: true, message: 'Account deleted' });
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
