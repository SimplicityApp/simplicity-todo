import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { TIMINGS } from '../constants/theme';
import { useSettingsStore } from '../stores/settingsStore';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Notification permissions not granted');
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D84315',
    });
  }

  return true;
};

/**
 * Schedule notification for task deadline (buffer period)
 */
export const scheduleTaskDeadlineNotification = async (
  taskId: number,
  taskTitle: string,
  deadline: string
): Promise<string | null> => {
  try {
    const settings = useSettingsStore.getState().settings;
    const bufferMinutes = settings?.buffer_minutes || TIMINGS.BUFFER_MINUTES;

    const deadlineTime = new Date(deadline).getTime();
    const bufferEndTime = deadlineTime + bufferMinutes * 60 * 1000;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Task expiring soon',
        body: `"${taskTitle}" will be archived in a few minutes. Mark as complete or it will move to unfinished.`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { taskId },
      },
      trigger: new Date(bufferEndTime) as any,
    });

    return notificationId;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return null;
  }
};

/**
 * Schedule reminder notification (e.g., 1 hour before deadline)
 */
export const scheduleTaskReminderNotification = async (
  taskId: number,
  taskTitle: string,
  deadline: string,
  reminderMinutesBefore: number = 60
): Promise<string | null> => {
  try {
    const deadlineTime = new Date(deadline).getTime();
    const reminderTime = new Date(deadlineTime - reminderMinutesBefore * 60 * 1000);

    // Don't schedule if reminder time is in the past
    if (reminderTime.getTime() < Date.now()) {
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Task reminder',
        body: `"${taskTitle}" has ${reminderMinutesBefore} minutes remaining`,
        sound: true,
        data: { taskId },
      },
      trigger: reminderTime as any,
    });

    return notificationId;
  } catch (error) {
    console.error('Failed to schedule reminder:', error);
    return null;
  }
};

/**
 * Cancel a scheduled notification
 */
export const cancelNotification = async (notificationId: string): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Failed to cancel notification:', error);
  }
};

/**
 * Cancel all notifications for a specific task
 */
export const cancelTaskNotifications = async (reminderNotificationId?: string, deadlineNotificationId?: string): Promise<void> => {
  try {
    if (reminderNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(reminderNotificationId);
    }
    if (deadlineNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(deadlineNotificationId);
    }
  } catch (error) {
    console.error('Failed to cancel task notifications:', error);
  }
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Failed to cancel all notifications:', error);
  }
};
