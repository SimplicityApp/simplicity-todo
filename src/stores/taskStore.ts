import { create } from 'zustand';
import { dbOperations } from '../database/db';
import { calculateDeadline, hasExpired } from '../utils/timeUtils';
import type { Task, TaskInsert, TaskStats } from '../types';
import { TIMINGS } from '../constants/theme';
import { scheduleTaskDeadlineNotification, scheduleTaskReminderNotification, cancelTaskNotifications } from '../services/notificationService';

interface TaskStore {
  // State
  activeTasks: Task[];
  archivedTasks: {
    finished: Task[];
    unfinished: Task[];
  };
  isLoading: boolean;

  // Actions
  loadActiveTasks: () => void;
  loadArchivedTasks: () => void;
  createTask: (task: TaskInsert, customDeadline?: Date) => Promise<void>;
  updateTask: (taskId: number, updates: { title?: string; description?: string; deadline?: string }) => Promise<void>;
  deleteTask: (taskId: number) => Promise<void>;
  completeTask: (taskId: number) => Promise<void>;
  reEnableTask: (taskId: number) => Promise<void>;
  checkExpiredTasks: () => void;
  canCreateTask: () => boolean;
  getStats: (startDate: string, endDate: string) => TaskStats;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  // Initial state
  activeTasks: [],
  archivedTasks: {
    finished: [],
    unfinished: [],
  },
  isLoading: false,

  // Load active tasks
  loadActiveTasks: () => {
    const tasks = dbOperations.getActiveTasks();
    set({ activeTasks: tasks });
  },

  // Load archived tasks
  loadArchivedTasks: () => {
    const archived = dbOperations.getArchivedTasks();
    set({ archivedTasks: archived });
  },

  // Check if user can create a new task (max 2 active tasks)
  canCreateTask: () => {
    const { activeTasks } = get();
    return activeTasks.length < TIMINGS.MAX_TASKS;
  },

  // Create a new task
  createTask: async (task: TaskInsert, customDeadline?: Date) => {
    const { canCreateTask, loadActiveTasks } = get();

    if (!canCreateTask()) {
      throw new Error(`Maximum ${TIMINGS.MAX_TASKS} active tasks allowed`);
    }

    try {
      const deadline = customDeadline ? customDeadline.toISOString() : calculateDeadline();
      const newTask = dbOperations.createTask(task, deadline);

      // Schedule notifications and store their IDs
      const deadlineNotificationId = await scheduleTaskDeadlineNotification(newTask.id, newTask.title, newTask.deadline);
      const reminderNotificationId = await scheduleTaskReminderNotification(newTask.id, newTask.title, newTask.deadline, 60);

      // Store notification IDs in database
      dbOperations.updateNotificationIds(newTask.id, reminderNotificationId, deadlineNotificationId);

      loadActiveTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  },

  // Update an existing task
  updateTask: async (taskId: number, updates: { title?: string; description?: string; deadline?: string }) => {
    try {
      dbOperations.updateTask(taskId, updates);
      get().loadActiveTasks();
      get().loadArchivedTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
      throw error;
    }
  },

  // Delete a task permanently
  deleteTask: async (taskId: number) => {
    try {
      // Get task to retrieve notification IDs
      const task = dbOperations.getTaskById(taskId);
      if (task) {
        // Cancel scheduled notifications before deleting
        await cancelTaskNotifications(task.reminder_notification_id, task.deadline_notification_id);
      }

      dbOperations.deleteTask(taskId);
      get().loadActiveTasks();
      get().loadArchivedTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error;
    }
  },

  // Mark task as completed
  completeTask: async (taskId: number) => {
    try {
      // Get task to retrieve notification IDs and check status
      const task = dbOperations.getTaskById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      // Check if task has already expired
      if (task.status === 'expired_unfinished') {
        throw new Error('Cannot complete an expired task');
      }

      // Check if task has expired based on deadline (race condition protection)
      if (hasExpired(task.deadline)) {
        throw new Error('Cannot complete an expired task');
      }

      // Cancel scheduled notifications
      await cancelTaskNotifications(task.reminder_notification_id, task.deadline_notification_id);

      dbOperations.completeTask(taskId);
      get().loadActiveTasks();
      get().loadArchivedTasks();
    } catch (error) {
      console.error('Failed to complete task:', error);
      throw error;
    }
  },

  // Re-enable an unfinished task
  reEnableTask: async (taskId: number) => {
    const { canCreateTask, loadActiveTasks, loadArchivedTasks } = get();

    if (!canCreateTask()) {
      throw new Error(`Maximum ${TIMINGS.MAX_TASKS} active tasks allowed`);
    }

    try {
      const newTask = dbOperations.reEnableTask(taskId);

      // Schedule notifications for the re-enabled task
      const deadlineNotificationId = await scheduleTaskDeadlineNotification(newTask.id, newTask.title, newTask.deadline);
      const reminderNotificationId = await scheduleTaskReminderNotification(newTask.id, newTask.title, newTask.deadline, 60);

      // Store notification IDs in database
      dbOperations.updateNotificationIds(newTask.id, reminderNotificationId, deadlineNotificationId);

      loadActiveTasks();
      loadArchivedTasks();
    } catch (error) {
      console.error('Failed to re-enable task:', error);
      throw error;
    }
  },

  // Check for expired tasks and move them to archive
  checkExpiredTasks: async () => {
    const { activeTasks, loadActiveTasks, loadArchivedTasks } = get();

    for (const task of activeTasks) {
      if (hasExpired(task.deadline)) {
        // Cancel scheduled notifications before expiring the task
        await cancelTaskNotifications(task.reminder_notification_id, task.deadline_notification_id);
        dbOperations.expireTask(task.id);
      }
    }

    loadActiveTasks();
    loadArchivedTasks();
  },

  // Get statistics for a time period
  getStats: (startDate: string, endDate: string): TaskStats => {
    return dbOperations.getStats(startDate, endDate);
  },
}));
