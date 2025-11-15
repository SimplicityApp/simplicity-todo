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
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTaskStore } from '../stores/taskStore';
import { Task } from '../types';
import { formatRelativeTime } from '../utils/timeUtils';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';

export const ArchiveScreen: React.FC = () => {
  const { archivedTasks, loadArchivedTasks, reEnableTask, canCreateTask } = useTaskStore();
  const [selectedTab, setSelectedTab] = useState<'finished' | 'unfinished'>('finished');

  useEffect(() => {
    loadArchivedTasks();
  }, []);

  // Swipe gesture handler
  const panGesture = Gesture.Pan()
    .onEnd((event) => {
      const SWIPE_THRESHOLD = 50;

      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe right: go to finished (left tab)
        setSelectedTab('finished');
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe left: go to unfinished (right tab)
        setSelectedTab('unfinished');
      }
    });

  const handleReEnable = (task: Task) => {
    if (!canCreateTask()) {
      Alert.alert(
        'Cannot re-enable task',
        'You already have 2 active tasks. Complete one first.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Re-enable this task?',
      task.title,
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              await reEnableTask(task.id);
            } catch (error) {
              console.error('Failed to re-enable task:', error);
              Alert.alert('Error', 'Failed to re-enable task');
            }
          },
        },
      ]
    );
  };

  const renderTaskItem = ({ item }: { item: Task }) => {
    const isUnfinished = selectedTab === 'unfinished';
    const timestamp = item.completed_at || item.deadline;

    return (
      <TouchableOpacity
        onPress={() => isUnfinished && handleReEnable(item)}
        disabled={!isUnfinished}
        style={styles.taskItem}
        activeOpacity={isUnfinished ? 0.7 : 1}
      >
        <View style={styles.taskContent}>
          <Text style={styles.taskTitle}>{item.title}</Text>
          {item.description && (
            <Text style={styles.taskDescription}>{item.description}</Text>
          )}
          <Text style={styles.taskTimestamp}>
            {formatRelativeTime(timestamp)}
          </Text>
          {item.reactivation_count > 0 && (
            <Text style={styles.reactivationCount}>
              Attempted {item.reactivation_count}{' '}
              {item.reactivation_count === 1 ? 'time' : 'times'}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const currentTasks = archivedTasks[selectedTab];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>Archive</Text>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            onPress={() => setSelectedTab('finished')}
            style={[
              styles.tab,
              selectedTab === 'finished' && styles.tabActive,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === 'finished' && styles.tabTextActive,
              ]}
            >
              Finished
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedTab('unfinished')}
            style={[
              styles.tab,
              selectedTab === 'unfinished' && styles.tabActive,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === 'unfinished' && styles.tabTextActive,
              ]}
            >
              Unfinished
            </Text>
          </TouchableOpacity>
        </View>

        <GestureDetector gesture={panGesture}>
          <View style={styles.gestureContainer}>
            {currentTasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  No {selectedTab} tasks yet
                </Text>
              </View>
            ) : (
              <FlatList
                data={currentTasks}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderTaskItem}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                contentContainerStyle={styles.listContent}
              />
            )}

            {selectedTab === 'unfinished' && currentTasks.length > 0 && (
              <Text style={styles.hint}>Tap a task to re-enable it</Text>
            )}
          </View>
        </GestureDetector>
      </View>
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
  tabContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.divider,
  },
  tabActive: {
    borderBottomColor: COLORS.text,
  },
  tabText: {
    ...TYPOGRAPHY.button,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.text,
  },
  gestureContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: SPACING.lg,
  },
  taskItem: {
    paddingVertical: SPACING.md,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    ...TYPOGRAPHY.task,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  taskDescription: {
    ...TYPOGRAPHY.description,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  taskTimestamp: {
    ...TYPOGRAPHY.timer,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  reactivationCount: {
    ...TYPOGRAPHY.timer,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...TYPOGRAPHY.description,
    color: COLORS.textSecondary,
  },
  hint: {
    ...TYPOGRAPHY.timer,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: SPACING.md,
  },
});
