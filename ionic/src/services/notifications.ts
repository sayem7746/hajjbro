import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';

export const notificationService = {
  async requestPermission(): Promise<boolean> {
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  },

  async schedulePrayerReminder(
    id: number,
    title: string,
    body: string,
    date: Date
  ): Promise<void> {
    const options: ScheduleOptions = {
      notifications: [
        {
          id,
          title,
          body,
          schedule: { at: date },
          sound: 'default',
        },
      ],
    };
    await LocalNotifications.schedule(options);
  },

  async scheduleRitualReminder(
    id: number,
    ritualName: string,
    scheduledDate: Date
  ): Promise<void> {
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title: 'Hajj Ritual Reminder',
          body: `It's time for: ${ritualName}. May Allah accept your worship.`,
          schedule: { at: scheduledDate },
          sound: 'default',
        },
      ],
    });
  },

  async cancelAll(): Promise<void> {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending);
    }
  },

  async addListener(callback: (notification: { id: number }) => void): Promise<void> {
    await LocalNotifications.addListener('localNotificationReceived', (notification) => {
      callback({ id: notification.id });
    });
  },
};
