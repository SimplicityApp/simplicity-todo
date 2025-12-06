import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import {
  getMaxDeadline,
  getMinDeadline,
  formatDeadlineDisplay,
  validateCustomDeadline,
  getTaskCreationWindow,
} from '../utils/timeUtils';

interface DeadlinePickerProps {
  onDeadlineChange: (deadline: Date) => void;
  initialDeadline?: Date;
}

export const DeadlinePicker: React.FC<DeadlinePickerProps> = ({
  onDeadlineChange,
  initialDeadline,
}) => {
  const [selectedDeadline, setSelectedDeadline] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minDeadline, setMinDeadline] = useState<Date>(new Date());
  const [maxDeadline, setMaxDeadline] = useState<Date>(new Date());

  useEffect(() => {
    // Set up min and max deadlines
    const min = getMinDeadline();
    const max = getMaxDeadline();
    setMinDeadline(min);
    setMaxDeadline(max);

    // Initialize selected deadline
    if (initialDeadline) {
      setSelectedDeadline(new Date(initialDeadline));
    } else {
      // Default to 3 hours from now
      const defaultDeadline = new Date();
      defaultDeadline.setHours(defaultDeadline.getHours() + 3);
      setSelectedDeadline(defaultDeadline);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  useEffect(() => {
    const validation = validateCustomDeadline(selectedDeadline);
    if (!validation.valid) {
      setError(validation.error || null);
    } else {
      setError(null);
      onDeadlineChange(selectedDeadline);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeadline]); // onDeadlineChange is stable (setState)

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (date) {
      // Ensure the selected date is within bounds
      const min = getMinDeadline();
      const max = getMaxDeadline();

      if (date < min) {
        setSelectedDeadline(min);
      } else if (date > max) {
        setSelectedDeadline(max);
      } else {
        setSelectedDeadline(date);
      }
    }
  };

  const handlePress = () => {
    setShowPicker(true);
  };

  const handleDismiss = () => {
    setShowPicker(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Set Deadline</Text>

      <TouchableOpacity
        style={styles.timePickerButton}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text style={styles.timePickerButtonText}>
          {formatDeadlineDisplay(selectedDeadline)}
        </Text>
        <Text style={styles.tapHint}>Tap to change</Text>
      </TouchableOpacity>

      {showPicker && (
        <>
          <DateTimePicker
            value={selectedDeadline}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={minDeadline}
            maximumDate={maxDeadline}
            minuteInterval={5}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.doneButton}
              onPress={handleDismiss}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.sm,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  timePickerButton: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.divider,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  timePickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.accent,
    marginBottom: SPACING.xs,
  },
  tapHint: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  doneButton: {
    backgroundColor: COLORS.accent,
    padding: SPACING.sm,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  error: {
    fontSize: TYPOGRAPHY.description.fontSize,
    color: COLORS.accent,
    marginTop: SPACING.sm,
  },
});
