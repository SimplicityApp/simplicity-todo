export type TaskStatus = 'active' | 'completed' | 'expired_unfinished';

export interface Task {
  id: number;
  user_id?: string;
  title: string;
  description?: string;
  created_at: string; // ISO timestamp
  deadline: string; // ISO timestamp (created_at + 6 hours)
  status: TaskStatus;
  completed_at?: string; // ISO timestamp
  reactivation_count: number;
  original_task_id?: number;
}

export interface TaskInsert {
  title: string;
  description?: string;
}

export interface TaskStats {
  finished: number;
  unfinished: number;
  totalAttempts: number;
}

export interface TimeWindow {
  canCreate: boolean;
  maxHours: number;
  reason?: string;
}
