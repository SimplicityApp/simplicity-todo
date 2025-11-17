import { dbOperations } from '../database/db';
import { hasExpired } from '../utils/timeUtils';
import { cancelTaskNotifications } from './notificationService';

/**
 * Check and expire tasks that have passed their deadline + buffer period
 * This should be called periodically (e.g., every minute) while app is running
 */
export const checkAndExpireTasks = async (): Promise<number> => {
  const activeTasks = dbOperations.getActiveTasks();
  let expiredCount = 0;

  for (const task of activeTasks) {
    if (hasExpired(task.deadline)) {
      // Cancel scheduled notifications before expiring the task
      await cancelTaskNotifications(task.reminder_notification_id, task.deadline_notification_id);
      dbOperations.expireTask(task.id);
      expiredCount++;
    }
  }

  return expiredCount;
};

/**
 * Setup automatic expiration checking
 * Returns cleanup function to stop checking
 */
export const setupAutoExpiration = (intervalMs: number = 60000): (() => void) => {
  // Run immediate check on setup (handles app reopening after task expired)
  checkAndExpireTasks().then((expired) => {
    if (expired > 0) {
      console.log(`Initial check: expired ${expired} task(s)`);
    }
  });

  // Then setup interval for periodic checks
  const interval = setInterval(async () => {
    const expired = await checkAndExpireTasks();
    if (expired > 0) {
      console.log(`Auto-expired ${expired} task(s)`);
    }
  }, intervalMs);

  return () => clearInterval(interval);
};
