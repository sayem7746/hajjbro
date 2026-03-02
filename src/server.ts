import cron from 'node-cron';
import app from './app.js';
import { env } from './config/env.js';
import './lib/prisma.js'; // ensure DB connection attempted at startup
import { logger } from './utils/logger.js';

function startCronJobs(): void {
  try {
    // Example: run daily at 00:00 for prayer time sync (placeholder)
    cron.schedule('0 0 * * *', () => {
      logger.info('Daily cron: prayer time sync placeholder');
    });
  } catch (e) {
    logger.warn({ err: e }, 'node-cron not configured or failed');
  }
}

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server started');
  startCronJobs();
});

server.on('error', (err) => {
  logger.error({ err }, 'Server error');
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down');
  server.close(() => process.exit(0));
});
