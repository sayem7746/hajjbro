import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.isDevelopment
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  base: { pid: process.pid },
  timestamp: pino.stdTimeFunctions.isoTime,
});
