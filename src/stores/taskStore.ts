import { create } from 'zustand';
import { dbOperations } from '../database/db';
import { calculateDeadline, hasExpired } from '../utils/timeUtils';
import type { Task, TaskInsert, TaskStats } from '../types';
import { TIMINGS } from '../constants/theme';
import { scheduleTaskDeadlineNotification, scheduleTaskReminderNotification } from '../services/notificationService';

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

      // Schedule notifications
      await scheduleTaskDeadlineNotification(newTask.id, newTask.title, newTask.deadline);
      await scheduleTaskReminderNotification(newTask.id, newTask.title, newTask.deadline, 60);

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
      dbOperations.reEnableTask(taskId);
      loadActiveTasks();
      loadArchivedTasks();
    } catch (error) {
      console.error('Failed to re-enable task:', error);
      throw error;
    }
  },

  // Check for expired tasks and move them to archive
  checkExpiredTasks: () => {
    const { activeTasks, loadActiveTasks, loadArchivedTasks } = get();

    activeTasks.forEach((task) => {
      if (hasExpired(task.deadline)) {
        dbOperations.expireTask(task.id);
      }
    });

    loadActiveTasks();
    loadArchivedTasks();
  },

  // Get statistics for a time period
  getStats: (startDate: string, endDate: string): TaskStats => {
    return dbOperations.getStats(startDate, endDate);
  },
}));
