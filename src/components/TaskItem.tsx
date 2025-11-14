import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Task } from '../types';
import { getRemainingTime } from '../utils/timeUtils';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';

interface TaskItemProps {
  task: Task;
  onComplete: (taskId: number) => void;
  onPress?: (task: Task) => void;
  onDelete?: (taskId: number) => void;
  showCheckbox?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onComplete,
  onPress,
  onDelete,
  showCheckbox = true
}) => {
  const [timeInfo, setTimeInfo] = useState(getRemainingTime(task.deadline));
  const [fadeAnim] = useState(new Animated.Value(1));
  const swipeableRef = useRef<Swipeable>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeInfo(getRemainingTime(task.deadline));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [task.deadline]);

  const handleComplete = () => {
    // Animate fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 1500,
      useNativeDriver: true,
    }).start(() => {
      onComplete(task.id);
    });
  };

  const handlePress = () => {
    if (onPress) {
      onPress(task);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      swipeableRef.current?.close();
      onDelete(task.id);
    }
  };

  const renderRightActions = () => {
    if (!onDelete) return null;

    return (
      <TouchableOpacity style={styles.deleteAction} onPress={handleDelete}>
        <Text style={styles.deleteActionText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  const taskContent = (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <TouchableOpacity
        style={styles.content}
        onPress={handlePress}
        activeOpacity={onPress ? 0.7 : 1}
        disabled={!onPress}
      >
        {showCheckbox && (
          <TouchableOpacity onPress={handleComplete} style={styles.checkbox}>
            <View style={styles.checkboxCircle} />
          </TouchableOpacity>
        )}

        <View style={styles.textContainer}>
          <Text style={styles.title}>{task.title}</Text>
          {task.description && (
            <Text style={styles.description}>{task.description}</Text>
          )}
          {task.status === 'active' && (
            <Text
              style={[
                styles.timer,
                (timeInfo.isUrgent || timeInfo.isBuffer) && styles.timerUrgent,
              ]}
            >
              {timeInfo.text}
            </Text>
          )}
          {task.reactivation_count > 0 && (
            <Text style={styles.reactivationCount}>
              Attempted {task.reactivation_count} {task.reactivation_count === 1 ? 'time' : 'times'}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  if (onDelete) {
    return (
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
      >
        {taskContent}
      </Swipeable>
    );
  }

  return taskContent;
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.background,
  },
  checkbox: {
    marginRight: SPACING.md,
    marginTop: 2,
  },
  checkboxCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.text,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...TYPOGRAPHY.task,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  description: {
    ...TYPOGRAPHY.description,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  timer: {
    ...TYPOGRAPHY.timer,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  timerUrgent: {
    color: COLORS.accent,
  },
  reactivationCount: {
    ...TYPOGRAPHY.timer,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  deleteAction: {
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  deleteActionText: {
    color: COLORS.background,
    fontWeight: '600',
    fontSize: 14,
  },
});
