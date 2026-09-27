import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  AppState,
} from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { colors } from './src/theme/colors';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { completeAuthRedirect, getAuthRedirectUri, supabase } from './src/lib/supabase';
import { getWhatsAppScheduleLabel } from './src/lib/whatsappSender';
import { loadManualTasks, removeManualTask, saveManualTask } from './src/lib/manualTasks';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import TasksScreen from './src/screens/TasksScreen';
import DetectionsScreen from './src/screens/DetectionsScreen';
import PlacesScreen from './src/screens/PlacesScreen';
import IntegrationsScreen from './src/screens/IntegrationsScreen';
import AuthScreen from './src/screens/AuthScreen';

// Components
import BottomNavigation from './src/components/BottomNavigation';
import AddTaskModal from './src/components/AddTaskModal';
import * as Notifications from 'expo-notifications';
import {
  cancelLocationTaskNotifications,
  configureLocationNotificationPresentation,
  loadLocationTasks,
  markLocationTaskDone,
  openLocationSettings,
  setLocationReminderOwner,
  snoozeLocationTask,
  stopLocationGeofencing,
  syncLocationGeofences,
} from './src/lib/locationReminders';

WebBrowser.maybeCompleteAuthSession();
configureLocationNotificationPresentation();

function AppContent() {
  const { darkMode, theme } = useTheme();
  const [authSession, setAuthSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [currentTab, setCurrentTab] = useState('home');
  const [tasks, setTasks] = useState([]);
  const [detections, setDetections] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [gmailConnection, setGmailConnection] = useState({ connected: false, email: null });
  const [gmailBusy, setGmailBusy] = useState(false);
  const authUserId = authSession?.user?.id;
  const [inboxRefreshKey, setInboxRefreshKey] = useState(0);
  const handledLocationActions = useRef(new Set());
  const deletedWhatsAppTaskIds = useRef(new Set());
  const permissionAlertShown = useRef(false);

  useEffect(() => {
    setTasks([]);
    setDetections([]);
  }, [authUserId]);

  useEffect(() => {
    let active = true;
    loadManualTasks(authUserId).then((savedTasks) => {
      if (!active) return;
      setTasks((current) => [
        ...current.filter((task) => !task.id?.startsWith('task-manual-') || task.location_enabled),
        ...savedTasks,
      ]);
    });
    return () => { active = false; };
  }, [authUserId]);

  useEffect(() => {
    let active = true;
    const restoreLocationTasks = async () => {
      if (!authUserId) {
        await setLocationReminderOwner(null);
        try { await stopLocationGeofencing(); } catch { /* the OS may already have stopped it */ }
        return;
      }
      await setLocationReminderOwner(authUserId);
      const savedTasks = await loadLocationTasks(authUserId);
      if (!active) return;
      setTasks((current) => [
        ...current.filter((task) => !task.location_enabled),
        ...savedTasks,
      ]);
      try {
        const result = await syncLocationGeofences(authUserId, savedTasks);
        if (result.permissionMissing && savedTasks.some((task) => !task.completed)) {
          permissionAlertShown.current = true;
          Alert.alert('Location permission required', 'Location permission is required for location reminders.', [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: openLocationSettings },
          ]);
        }
      } catch (error) {
        console.warn('Could not restore location reminders:', error?.message || error);
      }
    };
    restoreLocationTasks();
    return () => { active = false; };
  }, [authUserId]);

  useEffect(() => {
    const processResponse = async (response) => {
      if (!authUserId) return;
      const action = response?.actionIdentifier;
      if (!['DONE', 'DISMISS', 'SNOOZE'].includes(action)) return;
      const notification = response.notification;
      const taskId = notification?.request?.content?.data?.taskId;
      if (!taskId) return;
      const responseId = `${notification.request.identifier}:${action}`;
      if (handledLocationActions.current.has(responseId)) return;
      handledLocationActions.current.add(responseId);
      if (action === 'DONE') {
        const updated = await markLocationTaskDone(authUserId, taskId, tasks);
        setTasks(updated);
        await cancelLocationTaskNotifications(taskId);
      } else if (action === 'SNOOZE') {
        await snoozeLocationTask(taskId, notification.request.content);
      }
      // Dismiss keeps the task active; the geofence's entered state prevents repeat alerts inside.
    };
    Notifications.getLastNotificationResponseAsync().then(processResponse).catch(() => undefined);
    const subscription = Notifications.addNotificationResponseReceivedListener(processResponse);
    return () => subscription.remove();
  }, [authUserId, tasks]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && authUserId) {
        syncLocationGeofences(authUserId, tasks).then((result) => {
          if (!result.permissionMissing) permissionAlertShown.current = false;
          else if (!permissionAlertShown.current && tasks.some((task) => task.location_enabled && !task.completed)) {
            permissionAlertShown.current = true;
            Alert.alert('Location permission required', 'Location permission is required for location reminders.', [
              { text: 'Not now', style: 'cancel' },
              { text: 'Open Settings', onPress: openLocationSettings },
            ]);
          }
        }).catch((error) => {
          console.warn('Could not refresh location reminders:', error?.message || error);
        });
      }
    });
    return () => subscription.remove();
  }, [authUserId, tasks]);

  useEffect(() => {
    if (!authUserId || !supabase) {
      setGmailConnection({ connected: false, email: null });
      return undefined;
    }
    let active = true;
    supabase.functions.invoke('gmail-status')
      .then(({ data, error }) => {
        if (active && !error && data) setGmailConnection({ connected: Boolean(data.connected), email: data.email || null });
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [authUserId]);

  useEffect(() => {
    if (!authUserId || !supabase) return undefined;
    let active = true;
    const loadDetections = async () => {
      const { data, error } = await supabase
        .from('pending_inbox_detections')
        .select('id,title,source,source_channel,message_id,description,context_text,date_time,priority,status,created_at')
        .eq('user_id', authUserId)
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false });
      if (!active || error || !data) return;
      const pendingRows = data.filter((row) => row.status === 'pending');
      const approvedRows = data.filter((row) => row.status === 'approved');
      const cloudDetections = pendingRows.map((row) => ({
        id: row.id,
        title: row.title,
        source: row.source,
        sourceChannel: row.source_channel,
        description: row.description,
        contextText: row.context_text,
        dateTime: row.date_time,
        priority: row.priority,
        status: row.status,
        createdAt: row.created_at,
        remote: true,
      }));
      const cloudTasks = approvedRows.map((row) => {
        const dueTime = row.date_time || 'No deadline provided';
        const dueDate = /^\d{4}-\d{2}-\d{2}/.test(dueTime) ? dueTime.slice(0, 10) : null;
        const dueTimeLower = dueTime.toLowerCase();
        return {
          id: row.id,
          title: row.title,
          description: row.description || row.context_text || '',
          source: row.source,
          category: 'Uncategorized',
          tag: null,
          dueTime,
          dueCategory: dueDate
            ? dueDate > new Date().toISOString().slice(0, 10) ? 'upcoming' : 'today'
            : dueTimeLower.includes('tomorrow') ? 'upcoming'
              : dueTimeLower.includes('today') ? 'today' : 'unscheduled',
          date: dueDate,
          completed: false,
          priority: row.priority || 'medium',
          sender: row.source_channel,
          remote: true,
        };
      });
      const { data: whatsappRows, error: whatsappError } = await supabase
        .from('whatsapp_tasks')
        .select('id,user_id,task_title,description,due_date,due_time,priority,source,sender,original_message,chat_id,message_id,status,created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (whatsappError) console.warn('Could not load WhatsApp tasks:', whatsappError.message);
      const whatsappTasks = (whatsappRows || [])
        .filter((row) => !deletedWhatsAppTaskIds.current.has(row.id))
        .map((row) => {
        const date = typeof row.due_date === 'string' ? row.due_date.slice(0, 10) : null;
        const dueTime = getWhatsAppScheduleLabel(date, row.due_time, row.description, row.original_message);
        return {
          id: row.id,
          title: row.task_title,
          description: row.description || '',
          source: 'whatsapp',
          category: 'Uncategorized',
          tag: null,
          dueTime,
          dueCategory: date
            ? date > new Date().toISOString().slice(0, 10) ? 'upcoming' : 'today'
            : 'unscheduled',
          date,
          completed: false,
          priority: row.priority || 'medium',
          sender: row.sender,
          original_message: row.original_message,
          chat_id: row.chat_id,
          message_id: row.message_id,
          whatsappRemote: true,
        };
        });
      const allCloudTasks = [...cloudTasks, ...whatsappTasks];
      setDetections(cloudDetections);
      setTasks((current) => {
        const existingRemote = new Map(current.filter((task) => task.remote || task.whatsappRemote).map((task) => [task.id, task]));
        return [
          ...current.filter((task) => !task.remote && !task.whatsappRemote),
          ...allCloudTasks.map((task) => {
            const existing = existingRemote.get(task.id);
            return {
              ...task,
              completed: existing?.completed || false,
              ...(existing?.location_enabled ? {
                location_enabled: true,
                location_name: existing.location_name,
                latitude: existing.latitude,
                longitude: existing.longitude,
                radius: existing.radius,
                repeatOnReentry: existing.repeatOnReentry,
                triggered: existing.triggered,
                inside: existing.inside,
              } : {}),
            };
          }),
        ];
      });
    };
    loadDetections();
    const refreshTimer = globalThis.setInterval(loadDetections, 15000);
    return () => {
      active = false;
      globalThis.clearInterval(refreshTimer);
    };
  }, [authUserId, inboxRefreshKey]);

  const handleConnectGmail = async () => {
    if (!supabase || gmailBusy) return;
    setGmailBusy(true);
    try {
      const redirectUri = Platform.OS === 'web' ? `${window.location.origin}/` : getAuthRedirectUri('integrations');
      const { data, error } = await supabase.functions.invoke('gmail-connect', { body: { redirectUri } });
      if (error || !data?.authorizationUrl) throw new Error(data?.error || error?.message || 'Could not start Gmail authorization.');
      const result = await WebBrowser.openAuthSessionAsync(data.authorizationUrl, redirectUri);
      if (result.type === 'success') {
        const { queryParams } = Linking.parse(result.url);
        if (queryParams?.gmail === 'error') throw new Error('Gmail could not be connected. Check Google consent and the Edge Function logs.');
        const { data: status, error: statusError } = await supabase.functions.invoke('gmail-status');
        if (statusError) throw statusError;
        setGmailConnection({ connected: Boolean(status?.connected), email: status?.email || null });
      }
    } catch (error) {
      Alert.alert('Gmail connection failed', error?.message || 'Please try again.');
    } finally {
      setGmailBusy(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (!supabase || gmailBusy) return;
    setGmailBusy(true);
    try {
      const { error } = await supabase.functions.invoke('gmail-disconnect');
      if (error) throw error;
      setGmailConnection({ connected: false, email: null });
    } catch (error) {
      Alert.alert('Could not disconnect Gmail', error?.message || 'Please try again.');
    } finally {
      setGmailBusy(false);
    }
  };

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return undefined;
    }

    let isMounted = true;
    const handleIncomingUrl = async (url) => {
      if (!url) return;
      if (url.includes('auth/reset-password')) setIsRecoveryMode(true);
      const result = await completeAuthRedirect(url);
      if (result.error && isMounted) {
        Alert.alert('Authentication link could not be opened', result.error.message);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      setAuthSession(session);
      if (event === 'PASSWORD_RECOVERY') setIsRecoveryMode(true);
      setAuthReady(true);
    });

    Linking.getInitialURL().then((url) => handleIncomingUrl(url));
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => handleIncomingUrl(url));
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setAuthSession(session);
        setAuthReady(true);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  const deleteWhatsAppTaskFromDatabase = async (taskId) => {
    if (!supabase) throw new Error('Supabase is not available. Please try again.');
    const { data, error, status, statusText } = await supabase
      .from('whatsapp_tasks')
      .delete()
      .eq('id', taskId)
      .select('id');
    if (error) {
      console.error('[WhatsApp task DELETE] Supabase error', {
        taskId,
        status,
        statusText,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }
    if (!data?.some((row) => row.id === taskId)) {
      console.error('[WhatsApp task DELETE] Supabase returned no deleted row', {
        taskId,
        status,
        statusText,
        data,
      });
      throw new Error('The WhatsApp task was not removed from the database. Check its delete policy and try again.');
    }
    console.info('[WhatsApp task DELETE] Supabase success', { taskId, status, statusText, data });
    deletedWhatsAppTaskIds.current.add(taskId);
  };

  const showWhatsAppTaskError = (title, error) => {
    const message = error?.message || 'Please try again.';
    console.error(title, error);
    if (Platform.OS === 'web' && typeof globalThis.alert === 'function') {
      globalThis.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  // Toggle task completion
  const handleToggleComplete = async (taskId) => {
    const currentTask = tasks.find((task) => task.id === taskId);
    if (currentTask?.whatsappRemote && !currentTask.completed) {
      try {
        await deleteWhatsAppTaskFromDatabase(taskId);
        setTasks((current) => current.filter((task) => task.id !== taskId));
      } catch (error) {
        showWhatsAppTaskError('Could not complete WhatsApp task', error);
      }
      return;
    }
    const nextTasks = tasks.map((task) => task.id === taskId ? { ...task, completed: !task.completed } : task);
    setTasks(nextTasks);
    const task = nextTasks.find((item) => item.id === taskId);
    if (task?.id?.startsWith('task-manual-') && !task.location_enabled) {
      try {
        await saveManualTask(authUserId, task);
      } catch (error) {
        console.error('Could not save manual task completion:', error);
        Alert.alert('Could not update task', error?.message || 'Please try again.');
      }
    }
    if (task?.location_enabled) {
      try {
        await syncLocationGeofences(authUserId, nextTasks);
        if (task.completed) await cancelLocationTaskNotifications(taskId);
      } catch (error) {
        Alert.alert('Location reminder update failed', error?.message || 'Please try again.');
      }
    }
  };

  // Save Task (Create new OR Update existing)
  const handleSaveTask = async (taskData) => {
    let nextTasks;
    if (taskToEdit) {
      if (taskToEdit.remote && supabase) {
        const deadline = taskData.dueTime === 'No deadline set' ? null : taskData.dueTime;
        const { error } = await supabase.from('pending_inbox_detections')
          .update({ title: taskData.title, description: taskData.description || '', date_time: deadline, priority: taskData.priority || 'medium' })
          .eq('id', taskData.id).eq('status', 'approved');
        if (error) {
          Alert.alert('Could not update task', error.message);
          return false;
        }
      }
      // Edit existing task
      const taskForRegistration = { ...taskData };
      nextTasks = tasks.map((task) => {
        if (task.id !== taskData.id) return task;
        const updated = { ...task, ...taskData };
        delete updated.resetTriggerState;
        return updated;
      });
      if (taskToEdit.location_enabled || taskData.location_enabled) {
        try {
          const tasksForRegistration = tasks.map((task) => task.id === taskData.id ? { ...task, ...taskForRegistration } : task);
          await syncLocationGeofences(authUserId, tasksForRegistration);
          if (!taskData.location_enabled) {
            await cancelLocationTaskNotifications(taskData.id);
            if (taskData.id?.startsWith('task-manual-')) await saveManualTask(authUserId, taskData);
          }
          if (taskData.location_enabled && taskData.id?.startsWith('task-manual-')) {
            await removeManualTask(authUserId, taskData.id);
          }
        } catch (error) {
          Alert.alert('Could not save location reminder', error?.message || 'Please try again.');
          return false;
        }
      } else if (taskData.id?.startsWith('task-manual-')) {
        try {
          await saveManualTask(authUserId, { ...taskData, completed: nextTasks.find((task) => task.id === taskData.id)?.completed || false });
        } catch (error) {
          Alert.alert('Could not save task', error?.message || 'Please try again.');
          return false;
        }
      }
      setTasks(nextTasks);
      Alert.alert('Task Updated', `"${taskData.title}" has been updated.`);
      setTaskToEdit(null);
    } else {
      // Create new task
      nextTasks = [taskData, ...tasks];
      if (taskData.location_enabled) {
        try {
          const result = await syncLocationGeofences(authUserId, nextTasks);
          if (result.permissionMissing) {
            Alert.alert('Location permission required', 'Location permission is required for location reminders. Open device settings and allow background location to activate this reminder.');
          } else {
            Alert.alert('Location reminder active', `“${taskData.title}” will remind you near ${taskData.location_name}.`);
          }
        } catch (error) {
          Alert.alert('Could not activate location reminder', error?.message || 'Please try again.');
          return false;
        }
      } else {
        try {
          await saveManualTask(authUserId, taskData);
        } catch (error) {
          console.error('Could not persist manually created task:', error);
          Alert.alert('Could not save task', error?.message || 'Please try again.');
          return false;
        }
      }
      setTasks(nextTasks);
      if (!taskData.location_enabled) {
        Alert.alert('Task Created', `"${taskData.title}" added to your Tasks & Dashboard.`);
      }
    }
    return true;
  };

  // Delete task
  const handleDeleteTask = async (taskId) => {
    const task = tasks.find((item) => item.id === taskId);
    if (task?.whatsappRemote) {
      try {
        await deleteWhatsAppTaskFromDatabase(taskId);
      } catch (error) {
        showWhatsAppTaskError('Could not delete WhatsApp task', error);
        return;
      }
    }
    if (task?.remote && supabase) {
      const { error } = await supabase.from('pending_inbox_detections')
        .update({ status: 'dismissed' }).eq('id', taskId).eq('status', 'approved');
      if (error) {
        Alert.alert('Could not delete task', error.message);
        return;
      }
    }
    if (task?.id?.startsWith('task-manual-')) {
      try {
        await removeManualTask(authUserId, taskId);
      } catch (error) {
        Alert.alert('Could not delete task', error?.message || 'Please try again.');
        return;
      }
    }
    const nextTasks = tasks.filter((item) => item.id !== taskId);
    setTasks((current) => current.filter((item) => item.id !== taskId));
    if (task?.location_enabled) {
      try {
        await syncLocationGeofences(authUserId, nextTasks);
        await cancelLocationTaskNotifications(taskId);
      } catch (error) {
        Alert.alert('Could not remove location reminder', error?.message || 'Please try again.');
      }
    }
    Alert.alert('Task Deleted', 'The task has been removed from InBox.');
  };

  // Open edit modal
  const handleEditTask = (task) => {
    setTaskToEdit(task);
    setIsAddModalOpen(true);
  };

  // Open create modal
  const handleOpenCreateModal = () => {
    setTaskToEdit(null);
    setIsAddModalOpen(true);
  };

  // Approve AI detected task -> moves to tasks list
  const handleApproveDetection = async (detection) => {
    if (detection.remote && supabase) {
      const { error } = await supabase.from('pending_inbox_detections')
        .update({ status: 'approved' }).eq('id', detection.id);
      if (error) {
        Alert.alert('Could not add task', error.message);
        return;
      }
    }
    const detectionDueTime = detection.dateTime || '';
    const detectionDueDate = /^\d{4}-\d{2}-\d{2}/.test(detectionDueTime) ? detectionDueTime.slice(0, 10) : null;
    const detectionDueTimeLower = detectionDueTime.toLowerCase();
    const createdTask = {
      id: detection.remote ? detection.id : `task-detected-${Date.now()}`,
      title: detection.title,
      description: detection.description || `Extracted from ${detection.sourceChannel}`,
      source: detection.source,
      category: detection.tag || 'Uncategorized',
      tag: detection.tag || null,
      dueTime: detectionDueTime || 'No deadline provided',
      dueCategory: detectionDueDate
        ? detectionDueDate > new Date().toISOString().slice(0, 10) ? 'upcoming' : 'today'
        : detectionDueTimeLower.includes('tomorrow') ? 'upcoming'
          : detectionDueTimeLower.includes('today') ? 'today' : 'unscheduled',
      date: detectionDueDate,
      completed: false,
      priority: (detection.priority || 'medium').toLowerCase(),
      sender: detection.sourceChannel,
      actionLabel: detection.source === 'zoom' ? 'Join' : (detection.source === 'whatsapp' ? 'Chat' : undefined),
      remote: Boolean(detection.remote),
    };

    setTasks(prev => [createdTask, ...prev]);
    setDetections(prev => prev.filter(d => d.id !== detection.id));
    Alert.alert('Task Added', `"${detection.title}" is now added to your Tasks.`);
  };

  // Dismiss detection
  const handleDismissDetection = async (detectionId) => {
    const detection = detections.find((item) => item.id === detectionId);
    if (detection?.remote && supabase) {
      const { error } = await supabase.from('pending_inbox_detections')
        .update({ status: 'dismissed' }).eq('id', detectionId);
      if (error) {
        Alert.alert('Could not dismiss detection', error.message);
        return;
      }
    }
    setDetections(prev => prev.filter(d => d.id !== detectionId));
  };

  // Handle task actions (Join Zoom, Navigate, etc.)
  const handleTaskAction = (task) => {
    if (task.source === 'zoom') {
      Alert.alert(
        'Launching Zoom Meeting',
        `Topic: ${task.title}\nSchedule: ${task.dueTime}`,
        [{ text: 'Dismiss', style: 'cancel' }, { text: 'Connect Now', onPress: () => {} }]
      );
    } else if (task.source === 'location') {
      Alert.alert(
        'Location Navigation',
        `Saved location: ${task.location_name || task.location?.placeName || task.tag || 'No location set'}${task.location_enabled ? `\nRadius: ${task.radius} m` : ''}.`,
        [{ text: 'OK', style: 'cancel' }]
      );
    } else if (task.source === 'whatsapp') {
      Alert.alert(
        'WhatsApp Thread',
        `Message: "${task.snippet || task.description}"`,
        [{ text: 'Close', style: 'cancel' }, { text: 'Open Chat', onPress: () => {} }]
      );
    } else {
      Alert.alert(
        task.title,
        `Source: ${task.source.toUpperCase()}\nDue: ${task.dueTime}\nCategory: ${task.category || task.tag}\nDetails: ${task.description}`
      );
    }
  };

  const pendingDetectionsCount = detections.filter(d => d.status === 'pending').length;
  const authUser = authSession?.user;
  const accountName = authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || authUser?.email?.split('@')[0] || 'there';
  const userProfile = {
    name: accountName.split(' ')[0],
    fullName: accountName,
    avatar: authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture || null,
  };

  if (!authReady) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.background} translucent={false} />
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!authSession || isRecoveryMode) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.background} translucent={false} />
        <AuthScreen
          darkMode={darkMode}
          recoveryMode={isRecoveryMode}
          onRecoveryComplete={() => setIsRecoveryMode(false)}
          onAuthenticated={setAuthSession}
        />
      </SafeAreaView>
    );
  }

  const renderActiveScreen = () => {
    switch (currentTab) {
      case 'home':
        return (
          <HomeScreen
            tasks={tasks}
            onToggleComplete={handleToggleComplete}
            onNavigateToTab={setCurrentTab}
            pendingDetectionsCount={pendingDetectionsCount}
            detections={detections}
            user={userProfile}
            onTaskAction={handleTaskAction}
            onRefresh={() => setInboxRefreshKey((key) => key + 1)}
          />
        );
      case 'tasks':
        return (
          <TasksScreen
            tasks={tasks}
            user={userProfile}
            onToggleComplete={handleToggleComplete}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onAddTaskPress={handleOpenCreateModal}
          />
        );
      case 'detections':
        return (
          <DetectionsScreen
            detections={detections}
            user={userProfile}
            onApproveDetection={handleApproveDetection}
            onDismissDetection={handleDismissDetection}
          />
        );
      case 'places':
        return (
          <PlacesScreen
            user={userProfile}
            onAddTaskPress={handleOpenCreateModal}
            onAddLocationTask={(reminder) => {
              const newTask = {
                id: `task-loc-${Date.now()}`,
                title: reminder.title,
                description: reminder.description || `When near ${reminder.placeName}, InBox will remind you.`,
                source: 'location',
                category: reminder.category || 'Personal',
                tag: reminder.placeName,
                dueTime: `Location Reminder (${reminder.radius})`,
                dueCategory: 'today',
                date: new Date().toISOString().split('T')[0],
                completed: false,
                priority: 'medium',
                location: {
                  placeName: reminder.placeName,
                  radius: reminder.radius,
                },
                actionLabel: 'Navigate'
              };
              setTasks(prev => [newTask, ...prev]);
            }}
          />
        );
      case 'profile':
      case 'integrations':
        return (
          <IntegrationsScreen
            authUser={authSession?.user}
            gmailConnection={gmailConnection}
            gmailBusy={gmailBusy}
            onConnectGmail={handleConnectGmail}
            onDisconnectGmail={handleDisconnectGmail}
            onSignOut={async () => {
              const { error } = await supabase.auth.signOut();
              if (error) Alert.alert('Could not sign out', error.message);
            }}
          />
        );
      default:
        return (
          <HomeScreen
            tasks={tasks}
            onToggleComplete={handleToggleComplete}
            onNavigateToTab={setCurrentTab}
            pendingDetectionsCount={pendingDetectionsCount}
            detections={detections}
            user={userProfile}
            onTaskAction={handleTaskAction}
            onRefresh={() => setInboxRefreshKey((key) => key + 1)}
          />
        );
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={darkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
        translucent={false}
      />

      {/* Screen View */}
      <View style={[styles.mainContainer, { backgroundColor: theme.background }]}>
        {renderActiveScreen()}
      </View>

      {/* Floating Add Task + Bottom Tab Navigation */}
      <BottomNavigation
        currentTab={currentTab}
        onTabSelect={setCurrentTab}
        detectionCount={pendingDetectionsCount}
        onAddTaskPress={handleOpenCreateModal}
      />

      {/* Interactive Add/Edit Task Modal */}
      <AddTaskModal
        visible={isAddModalOpen}
        userProfile={userProfile}
        taskToEdit={taskToEdit}
        onClose={() => {
          setIsAddModalOpen(false);
          setTaskToEdit(null);
        }}
        onSaveTask={handleSaveTask}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return <ThemeProvider><AppContent /></ThemeProvider>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  mainContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
