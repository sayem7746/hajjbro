import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';

export async function healthCheck(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV ?? 'development',
        database: 'connected',
      },
    });
  } catch (e) {
    next(e);
  }
}

export async function readinessCheck(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).send('OK');
  } catch (e) {
    next(e);
  }
}
