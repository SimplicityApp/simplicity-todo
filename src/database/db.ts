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
};
