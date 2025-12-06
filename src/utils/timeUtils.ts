import { TIMINGS } from '../constants/theme';
import type { TimeWindow } from '../types';
import { useSettingsStore } from '../stores/settingsStore';

/**
 * Get settings with fallback to defaults
 */
const getSettings = () => {
  try {
    return useSettingsStore.getState().settings;
  } catch {
    // Fallback to TIMINGS if settings not yet loaded
    return {
      buffer_minutes: TIMINGS.BUFFER_MINUTES,
      max_tasks: TIMINGS.MAX_TASKS,
    };
  }
};

/**
 * Get time periods with fallback to default
 */
const getTimePeriods = () => {
  try {
    const periods = useSettingsStore.getState().timePeriods;
    if (periods && periods.length > 0) {
      return periods;
    }
  } catch {
    // Fallback to default period if not loaded
  }

  // Default period: 5am - 9pm, 6 hours max duration
  return [{
    id: 0,
    start_hour: 5,
    start_minute: 0,
    end_hour: 21,
    end_minute: 0,
    max_duration_hours: 6,
    created_at: new Date().toISOString(),
  }];
};

/**
 * Check if current time is within a time period
 */
const isTimeInPeriod = (
  currentHour: number,
  currentMinute: number,
  startHour: number,
  startMinute: number,
  endHour: number,
  endMinute: number
): boolean => {
  const toMinutes = (h: number, m: number) => h * 60 + m;
  const current = toMinutes(currentHour, currentMinute);
  const start = toMinutes(startHour, startMinute);
  let end = toMinutes(endHour, endMinute);

  // Handle periods that cross midnight
  if (end <= start) {
    end += 24 * 60;
    if (current < start) {
      return toMinutes(currentHour + 24, currentMinute) < end;
    }
  }

  return current >= start && current < end;
};

/**
 * Check if current time allows task creation and determine max hours
 * Returns the matching time period's max duration
 */
export const getTaskCreationWindow = (): TimeWindow => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const periods = getTimePeriods();

  // Find the period that contains the current time
  for (const period of periods) {
    if (isTimeInPeriod(
      currentHour,
      currentMinute,
      period.start_hour,
      period.start_minute,
      period.end_hour,
      period.end_minute
    )) {
      return {
        canCreate: true,
        maxHours: period.max_duration_hours,
      };
    }
  }

  return {
    canCreate: false,
    maxHours: 0,
    reason: 'Outside any configured time period',
  };
};

/**
 * Calculate deadline for a new task based on current time window
 */
export const calculateDeadline = (): string => {
  const window = getTaskCreationWindow();
  if (!window.canCreate) {
    throw new Error('Cannot create task outside allowed time window');
  }

  const deadline = new Date();
  deadline.setHours(deadline.getHours() + window.maxHours);
  return deadline.toISOString();
};

/**
 * Get the maximum allowed deadline based on current time window
 */
export const getMaxDeadline = (): Date => {
  const window = getTaskCreationWindow();
  if (!window.canCreate) {
    throw new Error('Cannot create task outside allowed time window');
  }

  const maxDeadline = new Date();
  maxDeadline.setHours(maxDeadline.getHours() + window.maxHours);
  return maxDeadline;
};

/**
 * Get the minimum allowed deadline (now)
 */
export const getMinDeadline = (): Date => {
  return new Date();
};

/**
 * Validate if a custom deadline is within allowed range
 */
export const validateCustomDeadline = (deadline: Date): { valid: boolean; error?: string } => {
  const now = new Date();
  const maxDeadline = getMaxDeadline();

  if (deadline <= now) {
    return {
      valid: false,
      error: 'Deadline must be in the future',
    };
  }

  if (deadline > maxDeadline) {
    const window = getTaskCreationWindow();
    return {
      valid: false,
      error: `Deadline cannot exceed ${window.maxHours} hours from now`,
    };
  }

  return { valid: true };
};

/**
 * Format deadline to display hours, minutes, and date
 */
export const formatDeadlineDisplay = (deadline: Date): string => {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  // Format date
  const isToday = deadline.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = deadline.toDateString() === tomorrow.toDateString();

  let dateStr = '';
  if (isToday) {
    dateStr = 'Today';
  } else if (isTomorrow) {
    dateStr = 'Tomorrow';
  } else {
    dateStr = deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const timeStr = deadline.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return `${hours}h ${minutes}m (${dateStr} at ${timeStr})`;
};

/**
 * Check if a task is in buffer period (after deadline, before final expiration)
 */
export const isInBufferPeriod = (deadline: string): boolean => {
  const settings = getSettings();
  const deadlineTime = new Date(deadline).getTime();
  const now = Date.now();
  const bufferEnd = deadlineTime + settings.buffer_minutes * 60 * 1000;

  return now > deadlineTime && now <= bufferEnd;
};

/**
 * Check if a task has completely expired (past deadline + buffer)
 */
export const hasExpired = (deadline: string): boolean => {
  const settings = getSettings();
  const deadlineTime = new Date(deadline).getTime();
  const now = Date.now();
  const bufferEnd = deadlineTime + settings.buffer_minutes * 60 * 1000;

  return now > bufferEnd;
};

/**
 * Get remaining time for a task in human-readable format
 */
export const getRemainingTime = (deadline: string): { text: string; isUrgent: boolean; isBuffer: boolean } => {
  const settings = getSettings();
  const deadlineTime = new Date(deadline).getTime();
  const now = Date.now();
  const diff = deadlineTime - now;

  // Check if in buffer period
  if (diff < 0) {
    const bufferEnd = deadlineTime + settings.buffer_minutes * 60 * 1000;
    const bufferRemaining = bufferEnd - now;

    if (bufferRemaining > 0) {
      const minutes = Math.floor(bufferRemaining / 60000);
      return {
        text: `Buffer: ${minutes}m left`,
        isUrgent: true,
        isBuffer: true,
      };
    }

    return {
      text: 'Expired',
      isUrgent: true,
      isBuffer: false,
    };
  }

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  // Urgent if less than buffer time remaining
  const isUrgent = diff < settings.buffer_minutes * 60 * 1000;

  if (hours > 0) {
    return {
      text: `${hours}h ${minutes}m remaining`,
      isUrgent,
      isBuffer: false,
    };
  }

  return {
    text: `${minutes}m remaining`,
    isUrgent,
    isBuffer: false,
  };
};

/**
 * Format date as relative time (for archive view)
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  if (days === 1) {
    return 'Yesterday';
  }
  if (days < 7) {
    return `${days} days ago`;
  }
  if (weeks === 1) {
    return 'Last week';
  }
  if (weeks < 4) {
    return `${weeks} weeks ago`;
  }

  return date.toLocaleDateString();
};

/**
 * Get date range for stats period
 */
export const getDateRange = (
  period: 'day' | 'week' | 'month' | 'custom',
  customStart?: Date,
  customEnd?: Date
): { start: string; end: string } => {
  const end = new Date();
  let start = new Date();

  switch (period) {
    case 'day':
      start.setHours(0, 0, 0, 0);
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    case 'custom':
      if (customStart && customEnd) {
        start = customStart;
        end.setTime(customEnd.getTime());
      }
      break;
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
};
