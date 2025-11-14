// Paper & Ink Design Theme
export const COLORS = {
  background: '#FDFDF8', // warm white
  text: '#1A1A1A', // near black
  accent: '#D84315', // red-orange for urgency
  divider: '#E0E0E0', // subtle gray
  white: '#FFFFFF',
  textSecondary: '#666666',
};

export const TYPOGRAPHY = {
  title: {
    fontSize: 28,
    fontWeight: '600' as const,
    lineHeight: 34,
  },
  task: {
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 26,
  },
  description: {
    fontSize: 14,
    fontWeight: '300' as const,
    lineHeight: 20,
  },
  timer: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '500' as const,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const TIMINGS = {
  TASK_DURATION_HOURS: 6,
  BUFFER_MINUTES: 30,
  NIGHT_MODE_START_HOUR: 21, // 9pm
  NIGHT_MODE_END_HOUR: 5, // 5am (night mode ends at 04:59:59)
  NIGHT_MODE_DURATION_HOURS: 12,
  MAX_TASKS: 2,
};
