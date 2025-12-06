import React, { useState, useEffect } from 'react';
import { StatusBar, Modal, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from './src/database/db';
import { Task } from './src/types';
import { TodayScreen } from './src/screens/TodayScreen';
import { CreateTaskScreen } from './src/screens/CreateTaskScreen';
import { EditTaskScreen } from './src/screens/EditTaskScreen';
import { ArchiveScreen } from './src/screens/ArchiveScreen';
import { SummaryScreen } from './src/screens/SummaryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { TabBar, TabType } from './src/components/TabBar';
import { ConfirmDialog } from './src/components/ConfirmDialog';
import { COLORS } from './src/constants/theme';
import { requestNotificationPermissions } from './src/services/notificationService';
import { setupAutoExpiration } from './src/services/expirationService';
import { useTaskStore } from './src/stores/taskStore';
import { useSettingsStore } from './src/stores/settingsStore';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);

  useEffect(() => {
    // Initialize database on app start
    try {
      initDatabase();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }

    // Load settings and time periods from database
    const { loadSettings, loadTimePeriods } = useSettingsStore.getState();
    loadSettings();
    loadTimePeriods();

    // Request notification permissions
    requestNotificationPermissions();

    // Setup automatic task expiration checking (every minute)
    const cleanup = setupAutoExpiration(60000);

    return () => {
      cleanup();
    };
  }, []);

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };

  const handleCloseEdit = () => {
    setEditingTask(null);
    // Force reload of active tasks to refresh the UI immediately after editing
    const { loadActiveTasks } = useTaskStore.getState();
    loadActiveTasks();
  };

  const handleDeleteRequest = (taskId: number) => {
    setDeletingTaskId(taskId);
  };

  const handleDeleteFromEdit = async (taskId: number) => {
    try {
      const { deleteTask } = useTaskStore.getState();
      await deleteTask(taskId);
      // Don't close modal here - let EditTaskScreen handle it via onClose()
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw error; // Re-throw so EditTaskScreen can handle it
    }
  };

  const handleConfirmDelete = async () => {
    if (deletingTaskId !== null) {
      try {
        const { deleteTask } = useTaskStore.getState();
        await deleteTask(deletingTaskId);
        setDeletingTaskId(null);
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'today':
        return (
          <TodayScreen
            onCreateTask={() => setShowCreateTask(true)}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteRequest}
          />
        );
      case 'archive':
        return <ArchiveScreen />;
      case 'summary':
        return <SummaryScreen />;
      case 'settings':
        return <SettingsScreen />;
    }
  };

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

        {renderScreen()}

        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

        <Modal
          visible={showCreateTask}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowCreateTask(false)}
        >
          <CreateTaskScreen onClose={() => setShowCreateTask(false)} />
        </Modal>

        {editingTask && (
          <Modal
            visible={true}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleCloseEdit}
          >
            <EditTaskScreen
              task={editingTask}
              onClose={handleCloseEdit}
              onDelete={handleDeleteFromEdit}
            />
          </Modal>
        )}

        <ConfirmDialog
          visible={deletingTaskId !== null}
          title="Delete Task"
          message="Are you sure you want to delete this task? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          destructive
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingTaskId(null)}
        />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
