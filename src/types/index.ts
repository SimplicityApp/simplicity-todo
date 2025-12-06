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
  reminder_notification_id?: string;
  deadline_notification_id?: string;
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

export interface Settings {
  id: number;
  max_tasks: number;
  buffer_minutes: number;
}

export interface TimePeriod {
  id: number;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
  max_duration_hours: number;
  created_at: string;
}
