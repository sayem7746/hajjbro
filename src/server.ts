import cron from 'node-cron';
import app from './app.js';
import { env } from './config/env.js';
import './lib/prisma.js'; // ensure DB connection attempted at startup
import { logger } from './utils/logger.js';
import { refreshDailyPrayerTimes } from './services/prayerTimesService.js';
import { dispatchScheduledNotifications } from './services/notificationScheduleService.js';

const SAUDI_CRON_TZ = env.SAUDI_TIMEZONE ?? 'Asia/Riyadh';

function startCronJobs(): void {
  try {
    // Refresh cached prayer times daily at 00:00 Saudi Arabia time
    cron.schedule('0 0 * * *', async () => {
      try {
        const { updated, errors } = await refreshDailyPrayerTimes();
        logger.info({ updated, errors }, 'Daily prayer times refresh completed');
      } catch (e) {
        logger.error({ err: e }, 'Daily prayer times refresh failed');
      }
    }, { timezone: SAUDI_CRON_TZ });

    // Dispatch scheduled push notifications every minute
    cron.schedule('* * * * *', async () => {
      try {
        await dispatchScheduledNotifications();
      } catch (e) {
        logger.error({ err: e }, 'Scheduled notifications dispatch failed');
      }
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
