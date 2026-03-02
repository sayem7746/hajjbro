import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
});

prisma.$connect().catch((e) => {
  logger.error({ err: e }, 'Prisma connect failed');
  process.exit(1);
});

export default prisma;
