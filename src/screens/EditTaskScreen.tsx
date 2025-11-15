import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Task } from '../types';
import { useTaskStore } from '../stores/taskStore';
import { COLORS, TYPOGRAPHY, SPACING } from '../constants/theme';
import { DeadlinePicker } from '../components/DeadlinePicker';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface EditTaskScreenProps {
  task: Task;
  onClose: () => void;
  onDelete: (taskId: number) => void;
}

export const EditTaskScreen: React.FC<EditTaskScreenProps> = ({ task, onClose, onDelete }) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [customDeadline, setCustomDeadline] = useState<Date>(new Date(task.deadline));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { updateTask } = useTaskStore();
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
      await updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        deadline: customDeadline.toISOString(),
      });
      onClose();
    } catch (error) {
      console.error('Failed to update task:', error);
      // TODO: Show error message to user
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const handleDeleteRequest = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      await onDelete(task.id);
      // Only close after successful delete
      onClose();
    } catch (error) {
      console.error('Failed to delete task:', error);
      // Still close on error
      onClose();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Edit Task</Text>
          <TouchableOpacity onPress={handleDeleteRequest} style={styles.deleteButton}>
            <Text style={styles.deleteIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
            initialDeadline={customDeadline}
          />

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
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    ...TYPOGRAPHY.title,
    color: COLORS.text,
    fontSize: 24,
  },
  deleteButton: {
    padding: SPACING.xs,
  },
  deleteIcon: {
    fontSize: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  inputContainer: {
    paddingTop: SPACING.md,
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
    minHeight: 60,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xl,
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
