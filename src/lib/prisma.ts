import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
});

if (env.DATABASE_URL) {
  prisma.$connect().catch((e) => {
    logger.error({ err: e }, 'Prisma connect failed');
    process.exit(1);
  });
} else {
  logger.warn('DATABASE_URL not set; database features disabled. Add PostgreSQL and set DATABASE_URL on Railway.');
}

export default prisma;
