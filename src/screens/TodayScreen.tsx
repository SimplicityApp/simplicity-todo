import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTaskStore } from '../stores/taskStore';
import { useSettingsStore } from '../stores/settingsStore';
import { Task } from '../types';
import { TaskItem } from '../components/TaskItem';
import { Fireworks } from '../components/Fireworks';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { getTaskCreationWindow } from '../utils/timeUtils';

interface TodayScreenProps {
  onCreateTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: number) => void;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({ onCreateTask, onEditTask, onDeleteTask }) => {
  // Select only the state we need to trigger re-renders
  const activeTasks = useTaskStore((state) => state.activeTasks);
  const maxTasks = useSettingsStore((state) => state.settings?.max_tasks || 2);

  const [showFireworks, setShowFireworks] = useState(false);

  useEffect(() => {
    // Get actions from store
    const { checkExpiredTasks } = useTaskStore.getState();

    // Check for expired tasks immediately on mount (handles app reopening after task expired)
    // This also loads active tasks, so no need to call loadActiveTasks separately
    checkExpiredTasks();

    // Check for expired tasks every minute
    const interval = setInterval(() => {
      const { checkExpiredTasks } = useTaskStore.getState();
      checkExpiredTasks();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleCompleteTask = async (taskId: number) => {
    const { completeTask, loadActiveTasks } = useTaskStore.getState();

    try {
      await completeTask(taskId);
      // Show fireworks right as task disappears (~350ms for animations)
      setTimeout(() => {
        setShowFireworks(true);
      }, 350);
    } catch (error) {
      console.error('Failed to complete task:', error);

      // If task has expired, show alert and refresh the list
      if (error instanceof Error && error.message.includes('expired')) {
        Alert.alert(
          'Task Expired',
          'This task has already expired and moved to unfinished tasks.',
          [{ text: 'OK', onPress: () => loadActiveTasks() }]
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to complete task. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleFireworksComplete = () => {
    setShowFireworks(false);
  };

  const timeWindow = getTaskCreationWindow();
  const canCreate = useTaskStore.getState().canCreateTask();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>
          Next {timeWindow.maxHours} hours
        </Text>

        {activeTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No active tasks</Text>
            <Text style={styles.emptySubtext}>
              Create up to {maxTasks} tasks to focus on
            </Text>
          </View>
        ) : (
          <FlatList
            data={activeTasks}
            keyExtractor={(item) => `${item.id}-${item.deadline}`}
            renderItem={({ item }) => (
              <View style={styles.taskItemWrapper}>
                <TaskItem
                  task={item}
                  onComplete={handleCompleteTask}
                  onPress={onEditTask}
                  onDelete={onDeleteTask}
                />
              </View>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.listContent}
            extraData={activeTasks}
          />
        )}

        <View style={styles.separator} />

        {canCreate ? (
          <TouchableOpacity onPress={onCreateTask} style={styles.addButton}>
            <Text style={styles.addButtonText}>+ New task</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.limitReached}>
            <Text style={styles.limitText}>
              Maximum {maxTasks} tasks active
            </Text>
            <Text style={styles.limitSubtext}>
              Complete a task to create a new one
            </Text>
          </View>
        )}
      </View>

      {showFireworks && <Fireworks onComplete={handleFireworksComplete} />}
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
    marginBottom: SPACING.xl,
  },
  listContent: {
    flexGrow: 1,
  },
  taskItemWrapper: {
    width: '100%',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SPACING.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyText: {
    ...TYPOGRAPHY.task,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  emptySubtext: {
    ...TYPOGRAPHY.description,
    color: COLORS.textSecondary,
  },
  addButton: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  addButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text,
  },
  limitReached: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  limitText: {
    ...TYPOGRAPHY.description,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  limitSubtext: {
    ...TYPOGRAPHY.timer,
    color: COLORS.textSecondary,
  },
});
