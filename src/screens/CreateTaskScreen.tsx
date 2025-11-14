import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTaskStore } from '../stores/taskStore';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { DeadlinePicker } from '../components/DeadlinePicker';

interface CreateTaskScreenProps {
  onClose: () => void;
}

export const CreateTaskScreen: React.FC<CreateTaskScreenProps> = ({ onClose }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customDeadline, setCustomDeadline] = useState<Date | null>(null);
  const { createTask } = useTaskStore();
  const titleInputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Auto-focus on title input when screen opens
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 100);
  }, []);

  const handleSave = async () => {
    if (!title.trim()) {
      return;
    }

    try {
      await createTask(
        {
          title: title.trim(),
          description: description.trim() || undefined,
        },
        customDeadline || undefined
      );
      onClose();
    } catch (error) {
      console.error('Failed to create task:', error);
      // TODO: Show error message to user
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.inputContainer}>
              <TextInput
                ref={titleInputRef}
                style={styles.titleInput}
                placeholder="What needs to be done?"
                placeholderTextColor={COLORS.textSecondary}
                value={title}
                onChangeText={setTitle}
                multiline
                maxLength={200}
                returnKeyType="next"
                blurOnSubmit={false}
              />

              <TextInput
                style={styles.descriptionInput}
                placeholder="Add details (optional)"
                placeholderTextColor={COLORS.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={500}
              />
            </View>

            <DeadlinePicker
              onDeadlineChange={setCustomDeadline}
            />
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={handleCancel}
              style={[styles.button, styles.cancelButton]}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              style={[styles.button, styles.saveButton]}
              disabled={!title.trim()}
            >
              <Text
                style={[
                  styles.saveButtonText,
                  !title.trim() && styles.saveButtonTextDisabled,
                ]}
              >
                Done
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    justifyContent: 'space-between',
  },
  scrollView: {
    flex: 1,
  },
  inputContainer: {
    paddingTop: SPACING.xl,
  },
  titleInput: {
    ...TYPOGRAPHY.title,
    color: COLORS.text,
    marginBottom: SPACING.lg,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  descriptionInput: {
    ...TYPOGRAPHY.description,
    color: COLORS.textSecondary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  button: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  cancelButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.text,
  },
  saveButton: {
    backgroundColor: COLORS.text,
  },
  saveButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.background,
  },
  saveButtonTextDisabled: {
    opacity: 0.5,
  },
});
