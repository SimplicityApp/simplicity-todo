import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTaskStore } from '../stores/taskStore';
import { getDateRange } from '../utils/timeUtils';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import type { TaskStats } from '../types';

type Period = 'day' | 'week' | 'month';

export const SummaryScreen: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('week');
  const [stats, setStats] = useState<TaskStats>({ finished: 0, unfinished: 0, totalAttempts: 0 });
  const { getStats } = useTaskStore();

  useEffect(() => {
    loadStats();
  }, [selectedPeriod]);

  const loadStats = () => {
    const { start, end } = getDateRange(selectedPeriod);
    const periodStats = getStats(start, end);
    setStats(periodStats);
  };

  const totalTasks = stats.finished + stats.unfinished;
  const completionRate = totalTasks > 0
    ? Math.round((stats.finished / totalTasks) * 100)
    : 0;

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'day':
        return 'Today';
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.header}>Summary</Text>

        <View style={styles.periodSelector}>
          <TouchableOpacity
            onPress={() => setSelectedPeriod('day')}
            style={[
              styles.periodButton,
              selectedPeriod === 'day' && styles.periodButtonActive,
            ]}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === 'day' && styles.periodButtonTextActive,
              ]}
            >
              Day
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedPeriod('week')}
            style={[
              styles.periodButton,
              selectedPeriod === 'week' && styles.periodButtonActive,
            ]}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === 'week' && styles.periodButtonTextActive,
              ]}
            >
              Week
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedPeriod('month')}
            style={[
              styles.periodButton,
              selectedPeriod === 'month' && styles.periodButtonActive,
            ]}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === 'month' && styles.periodButtonTextActive,
              ]}
            >
              Month
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.periodLabel}>{getPeriodLabel()}</Text>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Finished:</Text>
            <Text style={styles.statValue}>{stats.finished}</Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Unfinished:</Text>
            <Text style={styles.statValue}>{stats.unfinished}</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total tasks:</Text>
            <Text style={styles.statValue}>{totalTasks}</Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Completion rate:</Text>
            <Text style={[styles.statValue, styles.completionRate]}>
              {completionRate}%
            </Text>
          </View>

          {stats.totalAttempts > 0 && (
            <>
              <View style={styles.separator} />
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total re-attempts:</Text>
                <Text style={styles.statValue}>{stats.totalAttempts}</Text>
              </View>
            </>
          )}
        </View>

        {totalTasks === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No tasks for this period
            </Text>
          </View>
        )}

        {completionRate > 0 && (
          <View style={styles.visualBar}>
            <View
              style={[
                styles.visualBarFill,
                { width: `${completionRate}%` },
              ]}
            />
          </View>
        )}

        <View style={styles.insightContainer}>
          <Text style={styles.insightTitle}>Insights</Text>
          {completionRate >= 80 && (
            <Text style={styles.insightText}>
              Great focus! You're completing most of your tasks.
            </Text>
          )}
          {completionRate >= 50 && completionRate < 80 && (
            <Text style={styles.insightText}>
              Good progress. Try to maintain focus on your priorities.
            </Text>
          )}
          {completionRate > 0 && completionRate < 50 && (
            <Text style={styles.insightText}>
              Many tasks going unfinished. Consider choosing more realistic priorities.
            </Text>
          )}
          {totalTasks === 0 && (
            <Text style={styles.insightText}>
              Start creating tasks to track your productivity.
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  header: {
    ...TYPOGRAPHY.title,
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  periodButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: COLORS.text,
    borderColor: COLORS.text,
  },
  periodButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text,
  },
  periodButtonTextActive: {
    color: COLORS.background,
  },
  statsContainer: {
    marginBottom: SPACING.xl,
  },
  periodLabel: {
    ...TYPOGRAPHY.task,
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  statLabel: {
    ...TYPOGRAPHY.task,
    color: COLORS.text,
  },
  statValue: {
    ...TYPOGRAPHY.task,
    color: COLORS.text,
    fontWeight: '600',
  },
  completionRate: {
    color: COLORS.accent,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SPACING.md,
  },
  emptyState: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...TYPOGRAPHY.description,
    color: COLORS.textSecondary,
  },
  visualBar: {
    height: 8,
    backgroundColor: COLORS.divider,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
  },
  visualBarFill: {
    height: '100%',
    backgroundColor: COLORS.text,
  },
  insightContainer: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  insightTitle: {
    ...TYPOGRAPHY.task,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  insightText: {
    ...TYPOGRAPHY.description,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
});
