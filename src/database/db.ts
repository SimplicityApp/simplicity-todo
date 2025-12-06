import * as SQLite from 'expo-sqlite';
import type { Task, TaskInsert } from '../types';

// Lazy initialization - database is only opened when first accessed
let db: SQLite.SQLiteDatabase | null = null;

const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) {
    db = SQLite.openDatabaseSync('simple.db');
  }
  return db;
};

// Initialize database schema
export const initDatabase = () => {
  const database = getDatabase();

  database.execSync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      deadline TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('active', 'completed', 'expired_unfinished')),
      completed_at TEXT,
      reactivation_count INTEGER DEFAULT 0,
      original_task_id INTEGER,
      reminder_notification_id TEXT,
      deadline_notification_id TEXT,
      FOREIGN KEY (original_task_id) REFERENCES tasks (id)
    );
  `);

  // Create indices for better query performance
  database.execSync(`
    CREATE INDEX IF NOT EXISTS idx_status ON tasks(status);
  `);

  database.execSync(`
    CREATE INDEX IF NOT EXISTS idx_created_at ON tasks(created_at);
  `);

  database.execSync(`
    CREATE INDEX IF NOT EXISTS idx_deadline ON tasks(deadline);
  `);

  // Create settings table
  database.execSync(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      max_tasks INTEGER NOT NULL DEFAULT 2,
      buffer_minutes INTEGER NOT NULL DEFAULT 30
    );
  `);

  // Create time periods table
  database.execSync(`
    CREATE TABLE IF NOT EXISTS time_periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_hour INTEGER NOT NULL,
      start_minute INTEGER NOT NULL DEFAULT 0,
      end_hour INTEGER NOT NULL,
      end_minute INTEGER NOT NULL DEFAULT 0,
      max_duration_hours INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(start_hour, start_minute, end_hour, end_minute)
    );
  `);

  // Insert default settings if they don't exist
  const existingSettings = database.getFirstSync('SELECT * FROM settings WHERE id = 1');
  if (!existingSettings) {
    database.runSync(`
      INSERT INTO settings (id, max_tasks, buffer_minutes)
      VALUES (1, 2, 30)
    `);
  }

  // Insert default time period if none exist
  const existingPeriods = database.getFirstSync('SELECT COUNT(*) as count FROM time_periods');
  if (existingPeriods && (existingPeriods as any).count === 0) {
    const now = new Date().toISOString();
    database.runSync(`
      INSERT INTO time_periods (start_hour, start_minute, end_hour, end_minute, max_duration_hours, created_at)
      VALUES (5, 0, 21, 0, 6, ?)
    `, [now]);
  }

  // Migration: Add notification ID columns if they don't exist
  try {
    // Check if columns exist by trying to select them
    database.getFirstSync('SELECT reminder_notification_id, deadline_notification_id FROM tasks LIMIT 1');
  } catch (error) {
    // Columns don't exist, add them
    console.log('Migrating database: adding notification ID columns');
    database.execSync(`
      ALTER TABLE tasks ADD COLUMN reminder_notification_id TEXT;
    `);
    database.execSync(`
      ALTER TABLE tasks ADD COLUMN deadline_notification_id TEXT;
    `);
  }
};

// Database operations
export const dbOperations = {
  // Get all active tasks
  getActiveTasks: (): Task[] => {
    const database = getDatabase();
    const result = database.getAllSync('SELECT * FROM tasks WHERE status = ? ORDER BY created_at ASC', ['active']);
    return result as Task[];
  },

  // Get archived tasks (finished and unfinished)
  getArchivedTasks: (): { finished: Task[]; unfinished: Task[] } => {
    const database = getDatabase();
    const finished = database.getAllSync(
      'SELECT * FROM tasks WHERE status = ? ORDER BY completed_at DESC',
      ['completed']
    );

    const unfinished = database.getAllSync(
      'SELECT * FROM tasks WHERE status = ? ORDER BY deadline DESC',
      ['expired_unfinished']
    );

    return {
      finished: finished as Task[],
      unfinished: unfinished as Task[],
    };
  },

  // Create a new task
  createTask: (task: TaskInsert, deadline: string): Task => {
    const database = getDatabase();
    const now = new Date().toISOString();

    const result = database.runSync(
      `INSERT INTO tasks (title, description, created_at, deadline, status, reactivation_count)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [task.title, task.description || '', now, deadline, 'active', 0]
    );

    const newTask = database.getFirstSync('SELECT * FROM tasks WHERE id = ?', [result.lastInsertRowId]);
    return newTask as Task;
  },

  // Update task
  updateTask: (taskId: number, updates: { title?: string; description?: string; deadline?: string }): void => {
    const database = getDatabase();
    const task = database.getFirstSync('SELECT * FROM tasks WHERE id = ?', [taskId]) as Task | null;

    if (!task) {
      throw new Error('Task not found');
    }

    const title = updates.title !== undefined ? updates.title : task.title;
    const description = updates.description !== undefined ? updates.description : task.description;
    const deadline = updates.deadline !== undefined ? updates.deadline : task.deadline;

    database.runSync(
      'UPDATE tasks SET title = ?, description = ?, deadline = ? WHERE id = ?',
      [title, description, deadline, taskId]
    );
  },

  // Update notification IDs for a task
  updateNotificationIds: (taskId: number, reminderNotificationId: string | null, deadlineNotificationId: string | null): void => {
    const database = getDatabase();
    database.runSync(
      'UPDATE tasks SET reminder_notification_id = ?, deadline_notification_id = ? WHERE id = ?',
      [reminderNotificationId, deadlineNotificationId, taskId]
    );
  },

  // Get task by ID
  getTaskById: (taskId: number): Task | null => {
    const database = getDatabase();
    const task = database.getFirstSync('SELECT * FROM tasks WHERE id = ?', [taskId]);
    return task as Task | null;
  },

  // Delete task permanently
  deleteTask: (taskId: number): void => {
    const database = getDatabase();
    database.runSync('DELETE FROM tasks WHERE id = ?', [taskId]);
  },

  // Mark task as completed
  completeTask: (taskId: number): void => {
    const database = getDatabase();
    const now = new Date().toISOString();
    database.runSync(
      'UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?',
      ['completed', now, taskId]
    );
  },

  // Mark task as expired (unfinished)
  expireTask: (taskId: number): void => {
    const database = getDatabase();
    database.runSync(
      'UPDATE tasks SET status = ? WHERE id = ?',
      ['expired_unfinished', taskId]
    );
  },

  // Re-enable an unfinished task (creates new instance)
  reEnableTask: (originalTaskId: number): Task => {
    const database = getDatabase();
    const originalTask = database.getFirstSync('SELECT * FROM tasks WHERE id = ?', [originalTaskId]) as Task | null;

    if (!originalTask) {
      throw new Error('Original task not found');
    }

    const now = new Date().toISOString();
    const deadline = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(); // 6 hours from now

    const result = database.runSync(
      `INSERT INTO tasks (title, description, created_at, deadline, status, reactivation_count, original_task_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        originalTask.title,
        originalTask.description || '',
        now,
        deadline,
        'active',
        originalTask.reactivation_count + 1,
        originalTaskId,
      ]
    );

    const newTask = database.getFirstSync('SELECT * FROM tasks WHERE id = ?', [result.lastInsertRowId]);
    return newTask as Task;
  },

  // Get statistics for a time period
  getStats: (startDate: string, endDate: string) => {
    const database = getDatabase();
    const finished = database.getFirstSync(
      'SELECT COUNT(*) as count FROM tasks WHERE status = ? AND created_at BETWEEN ? AND ?',
      ['completed', startDate, endDate]
    ) as any;

    const unfinished = database.getFirstSync(
      'SELECT COUNT(*) as count FROM tasks WHERE status = ? AND created_at BETWEEN ? AND ?',
      ['expired_unfinished', startDate, endDate]
    ) as any;

    const totalAttempts = database.getFirstSync(
      'SELECT SUM(reactivation_count) as total FROM tasks WHERE created_at BETWEEN ? AND ?',
      [startDate, endDate]
    ) as any;

    return {
      finished: finished?.count || 0,
      unfinished: unfinished?.count || 0,
      totalAttempts: totalAttempts?.total || 0,
    };
  },

  // Get most re-enabled tasks
  getMostReenabledTasks: (limit: number = 10): Task[] => {
    const database = getDatabase();
    const result = database.getAllSync(
      'SELECT * FROM tasks WHERE reactivation_count > 0 ORDER BY reactivation_count DESC LIMIT ?',
      [limit]
    );
    return result as Task[];
  },

  // Delete all tasks (for testing/reset)
  deleteAllTasks: (): void => {
    const database = getDatabase();
    database.runSync('DELETE FROM tasks');
  },

  // Get settings
  getSettings: () => {
    const database = getDatabase();
    const settings = database.getFirstSync('SELECT * FROM settings WHERE id = 1');
    return settings as {
      id: number;
      max_tasks: number;
      buffer_minutes: number;
    };
  },

  // Update settings
  updateSettings: (updates: {
    max_tasks?: number;
    buffer_minutes?: number;
  }): void => {
    const database = getDatabase();
    const current = database.getFirstSync('SELECT * FROM settings WHERE id = 1') as any;

    const max_tasks = updates.max_tasks !== undefined ? updates.max_tasks : current.max_tasks;
    const buffer_minutes = updates.buffer_minutes !== undefined ? updates.buffer_minutes : current.buffer_minutes;

    database.runSync(
      `UPDATE settings SET max_tasks = ?, buffer_minutes = ? WHERE id = 1`,
      [max_tasks, buffer_minutes]
    );
  },

  // Get all time periods
  getTimePeriods: () => {
    const database = getDatabase();
    const periods = database.getAllSync('SELECT * FROM time_periods ORDER BY start_hour ASC, start_minute ASC');
    return periods as Array<{
      id: number;
      start_hour: number;
      start_minute: number;
      end_hour: number;
      end_minute: number;
      max_duration_hours: number;
      created_at: string;
    }>;
  },

  // Add a time period with overlap validation
  addTimePeriod: (
    start_hour: number,
    start_minute: number,
    end_hour: number,
    end_minute: number,
    max_duration_hours: number
  ): { success: boolean; error?: string; id?: number } => {
    const database = getDatabase();
    const periods = database.getAllSync('SELECT * FROM time_periods') as any[];

    // Check for overlaps
    for (const period of periods) {
      if (timePeriodsOverlap(
        { start_hour, start_minute, end_hour, end_minute },
        { start_hour: period.start_hour, start_minute: period.start_minute, end_hour: period.end_hour, end_minute: period.end_minute }
      )) {
        return {
          success: false,
          error: `Overlaps with existing period ${formatTime(period.start_hour, period.start_minute)} - ${formatTime(period.end_hour, period.end_minute)}`
        };
      }
    }

    const now = new Date().toISOString();
    const result = database.runSync(
      `INSERT INTO time_periods (start_hour, start_minute, end_hour, end_minute, max_duration_hours, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [start_hour, start_minute, end_hour, end_minute, max_duration_hours, now]
    );

    return { success: true, id: result.lastInsertRowId as number };
  },

  // Delete a time period
  deleteTimePeriod: (id: number): void => {
    const database = getDatabase();
    database.runSync('DELETE FROM time_periods WHERE id = ?', [id]);
  },

  // Update a time period
  updateTimePeriod: (
    id: number,
    start_hour: number,
    start_minute: number,
    end_hour: number,
    end_minute: number,
    max_duration_hours: number
  ): { success: boolean; error?: string } => {
    const database = getDatabase();
    const periods = database.getAllSync('SELECT * FROM time_periods WHERE id != ?', [id]) as any[];

    // Check for overlaps with other periods
    for (const period of periods) {
      if (timePeriodsOverlap(
        { start_hour, start_minute, end_hour, end_minute },
        { start_hour: period.start_hour, start_minute: period.start_minute, end_hour: period.end_hour, end_minute: period.end_minute }
      )) {
        return {
          success: false,
          error: `Overlaps with existing period ${formatTime(period.start_hour, period.start_minute)} - ${formatTime(period.end_hour, period.end_minute)}`
        };
      }
    }

    database.runSync(
      `UPDATE time_periods SET start_hour = ?, start_minute = ?, end_hour = ?, end_minute = ?, max_duration_hours = ? WHERE id = ?`,
      [start_hour, start_minute, end_hour, end_minute, max_duration_hours, id]
    );

    return { success: true };
  },
};

// Helper functions for time period validation
function timePeriodsOverlap(
  period1: { start_hour: number; start_minute: number; end_hour: number; end_minute: number },
  period2: { start_hour: number; start_minute: number; end_hour: number; end_minute: number }
): boolean {
  const toMinutes = (hour: number, minute: number) => hour * 60 + minute;

  const p1Start = toMinutes(period1.start_hour, period1.start_minute);
  let p1End = toMinutes(period1.end_hour, period1.end_minute);

  const p2Start = toMinutes(period2.start_hour, period2.start_minute);
  let p2End = toMinutes(period2.end_hour, period2.end_minute);

  // Handle periods that cross midnight
  if (p1End <= p1Start) p1End += 24 * 60;
  if (p2End <= p2Start) p2End += 24 * 60;

  // Check if periods overlap
  return (p1Start < p2End) && (p2Start < p1End);
}

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'pm' : 'am';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, '0')}${period}`;
}
