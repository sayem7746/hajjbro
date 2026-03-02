import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import prisma from '../lib/prisma.js';

export async function healthCheck(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let database: 'connected' | 'not_configured' | 'disconnected' = 'connected';
    if (!env.DATABASE_URL) {
      database = 'not_configured';
    } else {
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch {
        database = 'disconnected';
      }
    }
    const ok = database === 'connected';
    res.status(ok ? 200 : 503).json({
      success: ok,
      data: {
        status: ok ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV ?? 'development',
        database,
      },
    });
  } catch (e) {
    next(e);
  }
}

export async function readinessCheck(_req: Request, res: Response, _next: NextFunction): Promise<void> {
  try {
    if (!env.DATABASE_URL) {
      res.status(503).send('DATABASE_URL not set');
      return;
    }
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).send('OK');
  } catch (e) {
    res.status(503).send('Database unavailable');
  }
}
