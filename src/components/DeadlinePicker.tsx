import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
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
  const [selectedHours, setSelectedHours] = useState(0);
  const [selectedMinutes, setSelectedMinutes] = useState(0);
  const [maxHours, setMaxHours] = useState(6);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const window = getTaskCreationWindow();
    setMaxHours(window.maxHours);

    // Only initialize once on mount
    if (initialDeadline) {
      const now = new Date();
      const diff = initialDeadline.getTime() - now.getTime();
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      setSelectedHours(Math.max(0, Math.min(hours, window.maxHours)));
      setSelectedMinutes(Math.max(0, Math.min(minutes, 59)));
    } else {
      // Default to 3 hours from now
      setSelectedHours(3);
      setSelectedMinutes(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  useEffect(() => {
    const now = new Date();
    const deadline = new Date(now);
    deadline.setHours(deadline.getHours() + selectedHours);
    deadline.setMinutes(deadline.getMinutes() + selectedMinutes);

    const validation = validateCustomDeadline(deadline);
    if (!validation.valid) {
      setError(validation.error || null);
    } else {
      setError(null);
      onDeadlineChange(deadline);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHours, selectedMinutes]); // onDeadlineChange is stable (setState)

  const getCurrentDeadline = (): Date => {
    const now = new Date();
    const deadline = new Date(now);
    deadline.setHours(deadline.getHours() + selectedHours);
    deadline.setMinutes(deadline.getMinutes() + selectedMinutes);
    return deadline;
  };

  const adjustValue = (
    current: number,
    delta: number,
    min: number,
    max: number,
    setter: (value: number) => void
  ) => {
    const newValue = Math.max(min, Math.min(max, current + delta));
    setter(newValue);
  };

  const handleHoursChange = (text: string) => {
    const value = parseInt(text, 10);
    if (!isNaN(value) && value >= 0 && value <= maxHours) {
      setSelectedHours(value);
    } else if (text === '') {
      setSelectedHours(0);
    }
  };

  const handleMinutesChange = (text: string) => {
    const value = parseInt(text, 10);
    if (!isNaN(value) && value >= 0 && value <= 59) {
      setSelectedMinutes(value);
    } else if (text === '') {
      setSelectedMinutes(0);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Set Deadline</Text>

      <View style={styles.pickerRow}>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Hours</Text>
          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => adjustValue(selectedHours, -1, 0, maxHours, setSelectedHours)}
            >
              <Text style={styles.buttonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={selectedHours.toString()}
              onChangeText={handleHoursChange}
              keyboardType="number-pad"
              maxLength={2}
            />
            <TouchableOpacity
              style={styles.button}
              onPress={() => adjustValue(selectedHours, 1, 0, maxHours, setSelectedHours)}
            >
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Minutes</Text>
          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => adjustValue(selectedMinutes, -5, 0, 59, setSelectedMinutes)}
            >
              <Text style={styles.buttonText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={selectedMinutes.toString()}
              onChangeText={handleMinutesChange}
              keyboardType="number-pad"
              maxLength={2}
            />
            <TouchableOpacity
              style={styles.button}
              onPress={() => adjustValue(selectedMinutes, 5, 0, 59, setSelectedMinutes)}
            >
              <Text style={styles.buttonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <View style={styles.displayContainer}>
          <Text style={styles.displayValue}>
            {formatDeadlineDisplay(getCurrentDeadline())}
          </Text>
        </View>
      )}
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
  pickerRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  pickerContainer: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  button: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.accent,
  },
  input: {
    flex: 1,
    height: 32,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  displayContainer: {
    backgroundColor: COLORS.white,
    padding: SPACING.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.divider,
    alignItems: 'center',
  },
  displayValue: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.accent,
  },
  error: {
    fontSize: TYPOGRAPHY.description.fontSize,
    color: COLORS.accent,
    marginTop: SPACING.sm,
  },
});
