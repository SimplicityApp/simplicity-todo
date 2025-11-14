import { dbOperations } from '../database/db';
import { hasExpired } from '../utils/timeUtils';

/**
 * Check and expire tasks that have passed their deadline + buffer period
 * This should be called periodically (e.g., every minute) while app is running
 */
export const checkAndExpireTasks = (): number => {
  const activeTasks = dbOperations.getActiveTasks();
  let expiredCount = 0;

  activeTasks.forEach((task) => {
    if (hasExpired(task.deadline)) {
      dbOperations.expireTask(task.id);
      expiredCount++;
    }
  });

  return expiredCount;
};

/**
 * Setup automatic expiration checking
 * Returns cleanup function to stop checking
 */
export const setupAutoExpiration = (intervalMs: number = 60000): (() => void) => {
  const interval = setInterval(() => {
    const expired = checkAndExpireTasks();
    if (expired > 0) {
      console.log(`Auto-expired ${expired} task(s)`);
    }
  }, intervalMs);

  return () => clearInterval(interval);
};
