import { create } from 'zustand';
import { dbOperations } from '../database/db';
import type { Settings, TimePeriod } from '../types';

interface SettingsStore {
  settings: Settings;
  timePeriods: TimePeriod[];
  loadSettings: () => void;
  updateSettings: (updates: Partial<Omit<Settings, 'id'>>) => void;
  loadTimePeriods: () => void;
  addTimePeriod: (
    start_hour: number,
    start_minute: number,
    end_hour: number,
    end_minute: number,
    max_duration_hours: number
  ) => { success: boolean; error?: string };
  deleteTimePeriod: (id: number) => void;
  updateTimePeriod: (
    id: number,
    start_hour: number,
    start_minute: number,
    end_hour: number,
    end_minute: number,
    max_duration_hours: number
  ) => { success: boolean; error?: string };
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: {
    id: 1,
    max_tasks: 2,
    buffer_minutes: 30,
  },
  timePeriods: [],

  loadSettings: () => {
    const settings = dbOperations.getSettings();
    set({ settings });
  },

  updateSettings: (updates) => {
    dbOperations.updateSettings(updates);
    const settings = dbOperations.getSettings();
    set({ settings });
  },

  loadTimePeriods: () => {
    const timePeriods = dbOperations.getTimePeriods();
    set({ timePeriods });
  },

  addTimePeriod: (start_hour, start_minute, end_hour, end_minute, max_duration_hours) => {
    const result = dbOperations.addTimePeriod(start_hour, start_minute, end_hour, end_minute, max_duration_hours);
    if (result.success) {
      const timePeriods = dbOperations.getTimePeriods();
      set({ timePeriods });
    }
    return result;
  },

  deleteTimePeriod: (id) => {
    dbOperations.deleteTimePeriod(id);
    const timePeriods = dbOperations.getTimePeriods();
    set({ timePeriods });
  },

  updateTimePeriod: (id, start_hour, start_minute, end_hour, end_minute, max_duration_hours) => {
    const result = dbOperations.updateTimePeriod(id, start_hour, start_minute, end_hour, end_minute, max_duration_hours);
    if (result.success) {
      const timePeriods = dbOperations.getTimePeriods();
      set({ timePeriods });
    }
    return result;
  },
}));
