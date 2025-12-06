import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSettingsStore } from '../stores/settingsStore';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';

export const SettingsScreen: React.FC = () => {
  // Only subscribe to state values, not actions
  const settings = useSettingsStore((state) => state.settings);
  const timePeriods = useSettingsStore((state) => state.timePeriods);

  const [maxTasks, setMaxTasks] = useState(settings.max_tasks.toString());
  const [bufferMinutes, setBufferMinutes] = useState(settings.buffer_minutes.toString());

  // New period form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPeriodId, setEditingPeriodId] = useState<number | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [newMaxDuration, setNewMaxDuration] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    // Get actions from store
    const { loadSettings, loadTimePeriods } = useSettingsStore.getState();
    loadSettings();
    loadTimePeriods();
  }, []);

  useEffect(() => {
    setMaxTasks(settings.max_tasks.toString());
    setBufferMinutes(settings.buffer_minutes.toString());
  }, [settings]);

  const findNextAvailableSlot = useCallback((): { start: Date; end: Date } => {
    const toMinutes = (h: number, m: number) => h * 60 + m;
    const fromMinutes = (minutes: number) => {
      const h = Math.floor(minutes / 60) % 24;
      const m = minutes % 60;
      const date = new Date();
      date.setHours(h, m, 0, 0);
      return date;
    };

    if (timePeriods.length === 0) {
      // Default to 9am-11am if no periods exist
      return {
        start: fromMinutes(9 * 60),
        end: fromMinutes(11 * 60),
      };
    }

    // Sort existing periods by start time
    const sortedPeriods = [...timePeriods].sort((a, b) => {
      const aStart = toMinutes(a.start_hour, a.start_minute);
      const bStart = toMinutes(b.start_hour, b.start_minute);
      return aStart - bStart;
    });

    // Try to find a gap between periods (at least 2 hours)
    for (let i = 0; i < sortedPeriods.length - 1; i++) {
      const currentEnd = toMinutes(sortedPeriods[i].end_hour, sortedPeriods[i].end_minute);
      const nextStart = toMinutes(sortedPeriods[i + 1].start_hour, sortedPeriods[i + 1].start_minute);

      const gapSize = nextStart - currentEnd;
      if (gapSize >= 120) { // At least 2 hours gap
        return {
          start: fromMinutes(currentEnd),
          end: fromMinutes(currentEnd + 120),
        };
      }
    }

    // If no gap found, suggest after the last period
    const lastPeriod = sortedPeriods[sortedPeriods.length - 1];
    const lastEnd = toMinutes(lastPeriod.end_hour, lastPeriod.end_minute);
    return {
      start: fromMinutes(lastEnd),
      end: fromMinutes(lastEnd + 120),
    };
  }, [timePeriods]);

  // Initialize form with smart defaults when opening add form
  useEffect(() => {
    if (showAddForm) {
      const slot = findNextAvailableSlot();
      setStartTime(slot.start);
      setEndTime(slot.end);
      setValidationError(null);
      setNewMaxDuration('');
    }
    // Only run when showAddForm changes to true, not when findNextAvailableSlot changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAddForm]);

  const handleSave = () => {
    const { updateSettings } = useSettingsStore.getState();
    updateSettings({
      max_tasks: parseInt(maxTasks) || 2,
      buffer_minutes: parseInt(bufferMinutes) || 30,
    });
    Alert.alert('Success', 'Settings saved successfully');
  };

  const checkOverlap = (startHour: number, startMinute: number, endHour: number, endMinute: number): string | null => {
    for (const period of timePeriods) {
      // Skip the period being edited
      if (editingPeriodId !== null && period.id === editingPeriodId) {
        continue;
      }

      const toMinutes = (h: number, m: number) => h * 60 + m;

      const newStart = toMinutes(startHour, startMinute);
      let newEnd = toMinutes(endHour, endMinute);

      const existingStart = toMinutes(period.start_hour, period.start_minute);
      let existingEnd = toMinutes(period.end_hour, period.end_minute);

      // Handle periods that cross midnight
      if (newEnd <= newStart) newEnd += 24 * 60;
      if (existingEnd <= existingStart) existingEnd += 24 * 60;

      // Check overlap
      if ((newStart < existingEnd) && (existingStart < newEnd)) {
        return `Overlaps with ${formatTime(period.start_hour, period.start_minute)} - ${formatTime(period.end_hour, period.end_minute)}`;
      }
    }
    return null;
  };

  const handleStartTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
    }

    if (selectedDate) {
      setStartTime(selectedDate);

      // Check for overlap in real-time
      const startHour = selectedDate.getHours();
      const startMinute = selectedDate.getMinutes();
      const endHour = endTime.getHours();
      const endMinute = endTime.getMinutes();

      const error = checkOverlap(startHour, startMinute, endHour, endMinute);
      setValidationError(error);
    }
  };

  const handleEndTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
    }

    if (selectedDate) {
      setEndTime(selectedDate);

      // Check for overlap in real-time
      const startHour = startTime.getHours();
      const startMinute = startTime.getMinutes();
      const endHour = selectedDate.getHours();
      const endMinute = selectedDate.getMinutes();

      const error = checkOverlap(startHour, startMinute, endHour, endMinute);
      setValidationError(error);
    }
  };

  const handleSavePeriod = () => {
    const startHour = startTime.getHours();
    const startMinute = startTime.getMinutes();
    const endHour = endTime.getHours();
    const endMinute = endTime.getMinutes();
    const maxDuration = parseInt(newMaxDuration);

    if (isNaN(maxDuration)) {
      Alert.alert('Error', 'Please enter max duration');
      return;
    }

    if (maxDuration < 1 || maxDuration > 24) {
      Alert.alert('Error', 'Max duration must be between 1 and 24 hours');
      return;
    }

    if (validationError) {
      Alert.alert('Error', validationError);
      return;
    }

    if (editingPeriodId !== null) {
      // Update existing period
      const { updateTimePeriod } = useSettingsStore.getState();
      const result = updateTimePeriod(editingPeriodId, startHour, startMinute, endHour, endMinute, maxDuration);

      if (result.success) {
        setShowAddForm(false);
        setEditingPeriodId(null);
        setStartTime(new Date());
        setEndTime(new Date());
        setNewMaxDuration('');
        setValidationError(null);
        Alert.alert('Success', 'Time period updated successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to update time period');
      }
    } else {
      // Add new period
      const { addTimePeriod } = useSettingsStore.getState();
      const result = addTimePeriod(startHour, startMinute, endHour, endMinute, maxDuration);

      if (result.success) {
        setShowAddForm(false);
        setStartTime(new Date());
        setEndTime(new Date());
        setNewMaxDuration('');
        setValidationError(null);
        Alert.alert('Success', 'Time period added successfully');
      } else {
        Alert.alert('Error', result.error || 'Failed to add time period');
      }
    }
  };

  const handleEditPeriod = (period: any) => {
    const startDate = new Date();
    startDate.setHours(period.start_hour, period.start_minute, 0, 0);
    const endDate = new Date();
    endDate.setHours(period.end_hour, period.end_minute, 0, 0);

    setEditingPeriodId(period.id);
    setStartTime(startDate);
    setEndTime(endDate);
    setNewMaxDuration(period.max_duration_hours.toString());
    setValidationError(null);
    setShowAddForm(true);
  };

  const handleCancelEdit = () => {
    setShowAddForm(false);
    setEditingPeriodId(null);
    setStartTime(new Date());
    setEndTime(new Date());
    setNewMaxDuration('');
    setValidationError(null);
  };

  const handleDeletePeriod = (id: number) => {
    if (timePeriods.length <= 1) {
      Alert.alert('Error', 'You must have at least one time period');
      return;
    }

    Alert.alert(
      'Delete Time Period',
      'Are you sure you want to delete this time period?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const { deleteTimePeriod } = useSettingsStore.getState();
            deleteTimePeriod(id);
          },
        },
      ]
    );
  };

  const formatTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')}${period}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.header}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Maximum Active Tasks</Text>
              <Text style={styles.settingDescription}>
                How many tasks you can have active at once
              </Text>
            </View>
            <TextInput
              style={styles.input}
              value={maxTasks}
              onChangeText={setMaxTasks}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Buffer Time (minutes)</Text>
              <Text style={styles.settingDescription}>
                Grace period after deadline before task expires
              </Text>
            </View>
            <TextInput
              style={styles.input}
              value={bufferMinutes}
              onChangeText={setBufferMinutes}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Time Periods</Text>
            <TouchableOpacity
              onPress={() => {
                if (showAddForm) {
                  handleCancelEdit();
                } else {
                  setShowAddForm(true);
                }
              }}
              style={styles.addButton}
            >
              <Text style={styles.addButtonText}>{showAddForm ? '✕' : '+'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionDescription}>
            Define when you can create tasks and set maximum deadlines for each period
          </Text>

          {/* Existing periods - always visible */}
          {timePeriods.map((period) => (
            <View key={period.id} style={[styles.periodItem, showAddForm && editingPeriodId !== period.id && styles.periodItemDimmed]}>
              <TouchableOpacity
                style={styles.periodInfo}
                onPress={() => handleEditPeriod(period)}
                activeOpacity={0.7}
              >
                <Text style={styles.periodTime}>
                  {formatTime(period.start_hour, period.start_minute)} -{' '}
                  {formatTime(period.end_hour, period.end_minute)}
                </Text>
                <Text style={styles.periodDuration}>
                  Max deadline: {period.max_duration_hours}h
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeletePeriod(period.id)}
                style={styles.deleteButton}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Add/Edit form - appears below existing periods */}
          {showAddForm && (
            <View style={styles.addForm}>
              <Text style={styles.formTitle}>
                {editingPeriodId !== null ? 'Edit Time Period' : 'Add New Time Period'}
              </Text>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Time Range</Text>
                <View style={styles.timeRangeRow}>
                  {/* Start Time */}
                  <View style={styles.timePickerHalf}>
                    <Text style={styles.timeLabel}>Start</Text>
                    <TouchableOpacity
                      style={styles.timePickerButtonHorizontal}
                      onPress={() => setShowStartPicker(true)}
                    >
                      <Text style={styles.timePickerButtonText}>
                        {formatTime(startTime.getHours(), startTime.getMinutes())}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Separator */}
                  <Text style={styles.timeSeparator}>→</Text>

                  {/* End Time */}
                  <View style={styles.timePickerHalf}>
                    <Text style={styles.timeLabel}>End</Text>
                    <TouchableOpacity
                      style={styles.timePickerButtonHorizontal}
                      onPress={() => setShowEndPicker(true)}
                    >
                      <Text style={styles.timePickerButtonText}>
                        {formatTime(endTime.getHours(), endTime.getMinutes())}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {showStartPicker && (
                  <>
                    <DateTimePicker
                      value={startTime}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleStartTimeChange}
                      minuteInterval={5}
                    />
                    {Platform.OS === 'ios' && (
                      <TouchableOpacity
                        style={styles.pickerDoneButton}
                        onPress={() => setShowStartPicker(false)}
                      >
                        <Text style={styles.pickerDoneText}>Done</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                {showEndPicker && (
                  <>
                    <DateTimePicker
                      value={endTime}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleEndTimeChange}
                      minuteInterval={5}
                    />
                    {Platform.OS === 'ios' && (
                      <TouchableOpacity
                        style={styles.pickerDoneButton}
                        onPress={() => setShowEndPicker(false)}
                      >
                        <Text style={styles.pickerDoneText}>Done</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>

              {validationError && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{validationError}</Text>
                </View>
              )}

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Max Duration (hours)</Text>
                <TextInput
                  style={styles.durationInput}
                  placeholder="Hours"
                  value={newMaxDuration}
                  onChangeText={setNewMaxDuration}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>

              <View style={styles.formButtons}>
                {editingPeriodId !== null && (
                  <TouchableOpacity
                    onPress={handleCancelEdit}
                    style={[styles.formButton, styles.cancelButton]}
                  >
                    <Text style={styles.formButtonText}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleSavePeriod}
                  style={[
                    styles.formButton,
                    editingPeriodId === null && styles.formButtonFull,
                    validationError && styles.formButtonDisabled
                  ]}
                  disabled={!!validationError}
                >
                  <Text style={styles.formButtonText}>
                    {editingPeriodId !== null ? 'Save Changes' : 'Add Period'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  header: {
    ...TYPOGRAPHY.title,
    color: COLORS.text,
    marginBottom: SPACING.xl,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.divider,
    marginBottom: SPACING.sm,
  },
  settingInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  settingDescription: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  input: {
    width: 60,
    height: 40,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  addButton: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.text,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.background,
  },
  addForm: {
    backgroundColor: COLORS.accent,
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.text,
    marginTop: SPACING.md,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  formField: {
    marginBottom: SPACING.md,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  timeRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timePickerHalf: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.white,
    marginBottom: SPACING.xs / 2,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.white,
    marginHorizontal: SPACING.sm,
  },
  timePickerButton: {
    backgroundColor: COLORS.white,
    padding: SPACING.sm,
    borderRadius: 6,
    alignItems: 'center',
  },
  timePickerButtonHorizontal: {
    backgroundColor: COLORS.white,
    padding: SPACING.sm,
    borderRadius: 6,
    alignItems: 'center',
  },
  timePickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  tapToChange: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs / 2,
  },
  pickerDoneButton: {
    backgroundColor: COLORS.white,
    padding: SPACING.sm,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  pickerDoneText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  errorContainer: {
    backgroundColor: COLORS.white,
    padding: SPACING.sm,
    borderRadius: 6,
    marginBottom: SPACING.sm,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.accent,
    textAlign: 'center',
  },
  durationInput: {
    height: 40,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    paddingHorizontal: SPACING.sm,
  },
  formButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  formButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.sm,
    borderRadius: 6,
    alignItems: 'center',
  },
  formButtonFull: {
    flex: 1,
  },
  cancelButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  formButtonDisabled: {
    opacity: 0.5,
  },
  formButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  periodItemDimmed: {
    opacity: 0.6,
  },
  periodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.divider,
    marginBottom: SPACING.sm,
  },
  periodInfo: {
    flex: 1,
  },
  periodTime: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  periodDuration: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  deleteButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.accent,
  },
  saveButton: {
    backgroundColor: COLORS.text,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
  },
});
