import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
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
  const [isCompleting, setIsCompleting] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const checkScaleAnim = useRef(new Animated.Value(0)).current;
  const checkRotateAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const swipeableRef = useRef<Swipeable>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeInfo(getRemainingTime(task.deadline));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [task.deadline]);

  const handleComplete = () => {
    setIsCompleting(true);

    // Quick and snappy completion animation
    Animated.parallel([
      // 1. Checkbox fills and checkmark appears quickly
      Animated.sequence([
        Animated.spring(checkScaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 150,
          useNativeDriver: true,
        }),
        Animated.timing(checkRotateAnim, {
          toValue: 1,
          duration: 50,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      // 2. Quick scale bounce for the entire item
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.02,
          duration: 50,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 50,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Immediately fade out and slide away
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 20,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        onComplete(task.id);
      });
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

  const checkRotate = checkRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['-10deg', '0deg'],
  });

  const taskContent = (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: slideAnim },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={handlePress}
        activeOpacity={onPress ? 0.7 : 1}
        disabled={!onPress}
      >
        {showCheckbox && (
          <TouchableOpacity onPress={handleComplete} style={styles.checkbox} disabled={isCompleting}>
            <View style={styles.checkboxCircle}>
              {/* Filled background when completing */}
              <Animated.View
                style={[
                  styles.checkboxFill,
                  {
                    transform: [{ scale: checkScaleAnim }],
                  },
                ]}
              />
              {/* Checkmark */}
              <Animated.View
                style={[
                  styles.checkmarkContainer,
                  {
                    opacity: checkScaleAnim,
                    transform: [{ scale: checkScaleAnim }, { rotate: checkRotate }],
                  },
                ]}
              >
                <Text style={styles.checkmark}>✓</Text>
              </Animated.View>
            </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  checkboxFill: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.text,
  },
  checkmarkContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.background,
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
