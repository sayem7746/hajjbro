/**
 * Firebase Admin SDK - for push notifications.
 * Initialize when FIREBASE_PROJECT_ID (and credentials) are set.
 */
import { logger } from '../utils/logger.js';

let firebaseApp: import('firebase-admin').app.App | null = null;

export async function getFirebaseApp(): Promise<import('firebase-admin').app.App | null> {
  if (firebaseApp) return firebaseApp;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) {
    logger.debug('Firebase not configured; skipping init');
    return null;
  }
  try {
    const admin = await import('firebase-admin');
    firebaseApp = admin.apps.length
      ? admin.app()
      : admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
          }),
        });
    return firebaseApp;
  } catch (e) {
    logger.warn({ err: e }, 'Firebase Admin init failed');
    return null;
  }
}

export async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  const app = await getFirebaseApp();
  if (!app) return false;
  try {
    const { getMessaging } = await import('firebase-admin/messaging');
    const messaging = getMessaging(app);
    await messaging.send({
      token: fcmToken,
      notification: { title, body },
      data: data ?? {},
    });
    return true;
  } catch (e) {
    logger.warn({ err: e, fcmToken: fcmToken.slice(0, 20) }, 'FCM send failed');
    return false;
  }
}

/** Send the same push to many FCM tokens (chunks of 500). */
export async function sendMulticastPush(
  fcmTokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ successCount: number; failureCount: number }> {
  const unique = [...new Set(fcmTokens.filter(Boolean))];
  if (!unique.length) return { successCount: 0, failureCount: 0 };

  const app = await getFirebaseApp();
  if (!app) return { successCount: 0, failureCount: unique.length };

  try {
    const { getMessaging } = await import('firebase-admin/messaging');
    const messaging = getMessaging(app);
    let successCount = 0;
    let failureCount = 0;
    const chunkSize = 500;

    for (let i = 0; i < unique.length; i += chunkSize) {
      const chunk = unique.slice(i, i + chunkSize);
      const res = await messaging.sendEachForMulticast({
        tokens: chunk,
        notification: { title, body },
        data: data ?? {},
      });
      successCount += res.successCount;
      failureCount += res.failureCount;
    }

    return { successCount, failureCount };
  } catch (e) {
    logger.warn({ err: e, tokenCount: unique.length }, 'FCM multicast failed');
    return { successCount: 0, failureCount: unique.length };
  }
}
