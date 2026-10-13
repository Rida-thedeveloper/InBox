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
  Pressable,
  Text,
} from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { colors } from './src/theme/colors';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { completeAuthRedirect, getAuthRedirectUri, supabase } from './src/lib/supabase';
import { getWhatsAppScheduleLabel } from './src/lib/whatsappSender';
import { loadManualTasks, removeManualTask, saveManualTask } from './src/lib/manualTasks';
import { deleteCloudManualTask, loadCloudManualTasks, saveCloudManualTask } from './src/lib/cloudTasks';
import {
  loadApprovedWhatsAppTaskIds,
  loadDismissedWhatsAppTaskIds,
  saveApprovedWhatsAppTaskIds,
  saveDismissedWhatsAppTaskIds,
} from './src/lib/whatsappReview';
import { loadHiddenRemoteTaskIds, saveHiddenRemoteTaskIds } from './src/lib/hiddenRemoteTasks';

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
  const [focusDetectionId, setFocusDetectionId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [detections, setDetections] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [gmailConnection, setGmailConnection] = useState({ connected: false, email: null });
  const [gmailBusy, setGmailBusy] = useState(false);
  const [undoToast, setUndoToast] = useState(null);
  const authUserId = authSession?.user?.id;
  const [inboxRefreshKey, setInboxRefreshKey] = useState(0);
  const handledLocationActions = useRef(new Set());
  const deletedWhatsAppTaskIds = useRef(new Set());
  const approvedWhatsAppTaskIds = useRef(new Set());
  const dismissedWhatsAppTaskIds = useRef(new Set());
  const hiddenRemoteTaskIds = useRef(new Set());
  const pendingUndo = useRef(null);
  const undoTimer = useRef(null);
  const permissionAlertShown = useRef(false);

  const offerUndo = (message, undo, expire) => {
    if (undoTimer.current) globalThis.clearTimeout(undoTimer.current);
    const previous = pendingUndo.current;
    if (previous?.expire) Promise.resolve(previous.expire()).catch((error) => console.warn('Could not finish previous removal:', error?.message || error));
    pendingUndo.current = { undo, expire };
    setUndoToast(message);
    undoTimer.current = globalThis.setTimeout(async () => {
      const action = pendingUndo.current;
      pendingUndo.current = null;
      undoTimer.current = null;
      setUndoToast(null);
      if (action?.expire) {
        try { await action.expire(); } catch (error) { console.warn('Could not finish removal:', error?.message || error); }
      }
    }, 8000);
  };

  const runUndo = async () => {
    const action = pendingUndo.current;
    if (!action) return;
    if (undoTimer.current) globalThis.clearTimeout(undoTimer.current);
    pendingUndo.current = null;
    undoTimer.current = null;
    setUndoToast(null);
    try { await action.undo(); } catch (error) {
      console.error('Could not undo the removal:', error);
      Alert.alert('Could not undo', error?.message || 'Please try again.');
    }
  };

  useEffect(() => () => {
    if (undoTimer.current) globalThis.clearTimeout(undoTimer.current);
  }, []);

  useEffect(() => {
    setTasks([]);
    setDetections([]);
  }, [authUserId]);

  useEffect(() => {
    let active = true;
    (async () => {
      const storedTasks = await loadManualTasks(authUserId);
      const completedLocalTasks = storedTasks.filter((task) => task.completed);
      for (const task of completedLocalTasks) {
        try {
          await removeManualTask(authUserId, task.id);
        } catch (error) {
          console.warn('Could not remove a completed task from local storage:', error?.message || error);
        }
      }
      const cachedTasks = storedTasks.filter((task) => !task.completed);
      let savedTasks = cachedTasks;
      if (authUserId && supabase) {
        try {
          let cloudTasks = await loadCloudManualTasks(authUserId);
          const completedCloudTasks = cloudTasks.filter((task) => task.completed);
          const cleanupResults = await Promise.allSettled(completedCloudTasks.map((task) => (
            deleteCloudManualTask(authUserId, task.id, { requireMatch: false })
          )));
          if (cleanupResults.some((result) => result.status === 'rejected')) {
            console.warn('Some completed tasks could not be removed from Supabase yet.');
          }
          cloudTasks = cloudTasks.filter((task) => !task.completed);
          // Migrate active cached tasks and retry local saves that missed Supabase while offline.
          const cloudTaskIds = new Set(cloudTasks.map((task) => task.id));
          const unsyncedTasks = cachedTasks.filter((task) => !cloudTaskIds.has(task.id));
          if (unsyncedTasks.length) {
            await Promise.all(unsyncedTasks.map((task) => saveCloudManualTask(authUserId, task)));
            cloudTasks = await loadCloudManualTasks(authUserId);
            cloudTasks = cloudTasks.filter((task) => !task.completed);
          }
          savedTasks = cloudTasks;
          await Promise.all(cloudTasks.map((task) => saveManualTask(authUserId, task)));
        } catch (error) {
          console.warn('Could not sync manual tasks with Supabase; showing cached tasks:', error?.message || error);
        }
      }
      if (!active) return;
      setTasks((current) => [
        ...current.filter((task) => !task.completed && (!task.id?.startsWith('task-manual-') || task.location_enabled)),
        ...savedTasks.filter((task) => !task.completed),
      ]);
    })();
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
        ...current.filter((task) => !task.location_enabled && !task.completed),
        ...savedTasks.filter((task) => !task.completed),
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
        try {
          const task = tasks.find((item) => item.id === taskId);
          const updated = await markLocationTaskDone(authUserId, taskId, tasks);
          setTasks(updated);
          if (task?.id?.startsWith('task-manual-')) {
            await deleteCloudManualTask(authUserId, taskId, { requireMatch: false });
            await removeManualTask(authUserId, taskId);
          }
          await cancelLocationTaskNotifications(taskId);
        } catch (error) {
          Alert.alert('Could not complete task', error?.message || 'Please try again.');
        }
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
    let latestRefreshId = 0;
    const loadDetections = async (refreshId) => {
      const [approvedIds, dismissedIds, hiddenIds] = await Promise.all([
        loadApprovedWhatsAppTaskIds(authUserId),
        loadDismissedWhatsAppTaskIds(authUserId),
        loadHiddenRemoteTaskIds(authUserId),
      ]);
      approvedWhatsAppTaskIds.current = new Set(approvedIds);
      dismissedWhatsAppTaskIds.current = new Set(dismissedIds);
      hiddenRemoteTaskIds.current = new Set([...hiddenRemoteTaskIds.current, ...hiddenIds]);
      const { data, error } = await supabase
        .from('pending_inbox_detections')
        .select('id,title,source,source_channel,message_id,description,context_text,date_time,priority,status,created_at')
        .eq('user_id', authUserId)
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false });
      if (!active || refreshId !== latestRefreshId) return;
      if (error || !data) {
        console.warn('Could not load detections from Supabase:', error?.message || 'No data returned.');
        return;
      }
      const pendingRows = data.filter((row) => row.status === 'pending');
      const approvedRows = data.filter((row) => row.status === 'approved' && !hiddenRemoteTaskIds.current.has(row.id));
      const cloudDetections = pendingRows
        .filter((row) => !hiddenRemoteTaskIds.current.has(row.id))
        .map((row) => ({
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
          createdAt: row.created_at,
          remote: true,
        };
      });
      const { data: whatsappRows, error: whatsappError } = await supabase
        .from('whatsapp_tasks')
        .select('id,user_id,task_title,description,due_date,due_time,priority,source,sender,original_message,chat_id,message_id,status,created_at')
        .in('status', ['pending', 'approved'])
        .eq('user_id', authUserId)
        .order('created_at', { ascending: false });
      if (!active || refreshId !== latestRefreshId) return;
      if (whatsappError) console.warn('Could not load WhatsApp tasks:', whatsappError.message);
      const whatsappTasks = (whatsappRows || [])
        .filter((row) => row.status === 'approved'
          && !deletedWhatsAppTaskIds.current.has(row.id)
          && !hiddenRemoteTaskIds.current.has(row.id))
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
          createdAt: row.created_at,
          original_message: row.original_message,
          chat_id: row.chat_id,
          message_id: row.message_id,
          whatsappRemote: true,
        };
        });
      const whatsappDetections = (whatsappRows || [])
        .filter((row) => row.status === 'pending'
          && !deletedWhatsAppTaskIds.current.has(row.id)
          && !hiddenRemoteTaskIds.current.has(row.id)
          && !approvedWhatsAppTaskIds.current.has(row.id)
          && !dismissedWhatsAppTaskIds.current.has(row.id))
        .map((row) => ({
          id: row.id,
          title: row.task_title,
          source: 'whatsapp',
          sourceChannel: 'WhatsApp',
          description: row.description || '',
          contextText: row.original_message || row.description || '',
          dateTime: [row.due_date, row.due_time].filter(Boolean).join(' '),
          priority: row.priority || 'medium',
          status: 'pending',
          createdAt: row.created_at,
          sender: row.sender,
          original_message: row.original_message,
          chat_id: row.chat_id,
          message_id: row.message_id,
          whatsappRemote: true,
        }));
      const allCloudTasks = [...cloudTasks, ...whatsappTasks];
      setDetections([...cloudDetections, ...whatsappDetections]);
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
    const refreshDetections = () => {
      latestRefreshId += 1;
      loadDetections(latestRefreshId).catch((error) => {
        console.warn('Could not refresh detections:', error?.message || error);
      });
    };
    refreshDetections();
    const realtimeChannel = supabase
      .channel(`inbox-detections-${authUserId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pending_inbox_detections',
        filter: `user_id=eq.${authUserId}`,
      }, refreshDetections)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'whatsapp_tasks',
        filter: `user_id=eq.${authUserId}`,
      }, refreshDetections)
      .subscribe();
    const refreshTimer = globalThis.setInterval(refreshDetections, 5000);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshDetections();
    });
    const refreshOnFocus = () => refreshDetections();
    const refreshWhenVisible = () => {
      if (window.document.visibilityState === 'visible') refreshDetections();
    };
    if (Platform.OS === 'web') {
      window.addEventListener('focus', refreshOnFocus);
      window.document.addEventListener('visibilitychange', refreshWhenVisible);
    }
    return () => {
      active = false;
      latestRefreshId += 1;
      globalThis.clearInterval(refreshTimer);
      appStateSubscription.remove();
      if (Platform.OS === 'web') {
        window.removeEventListener('focus', refreshOnFocus);
        window.document.removeEventListener('visibilitychange', refreshWhenVisible);
      }
      supabase.removeChannel(realtimeChannel);
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

  const deleteRemoteDetectionTask = async (taskId) => {
    if (!supabase) throw new Error('Supabase is not available. Please try again.');
    const { data, error, status, statusText } = await supabase
      .from('pending_inbox_detections')
      .delete()
      .eq('id', taskId)
      .eq('user_id', authUserId)
      .select('id');
    if (error) {
      console.error('[Detection task DELETE] Supabase error', {
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
      throw new Error('Supabase did not confirm deleting this task. It is still available in the database.');
    }
  };

  const setWhatsAppTaskStatus = async (taskId, status) => {
    const { data, error } = await supabase.functions.invoke('whatsapp-task-status', {
      body: { taskId, status },
    });
    if (error || !data?.ok) throw new Error(data?.error || error?.message || 'Could not update the WhatsApp task.');
  };

  const setRemoteDetectionStatus = async (taskId, status) => {
    const { error } = await supabase.from('pending_inbox_detections')
      .update({ status }).eq('id', taskId).eq('user_id', authUserId);
    if (error) throw error;
  };

  const hideRemoteTaskInApp = async (task) => {
    const { id } = task;
    hiddenRemoteTaskIds.current.add(id);
    if (task.whatsappRemote) deletedWhatsAppTaskIds.current.add(id);
    setTasks((current) => current.filter((item) => item.id !== id));
    setDetections((current) => current.filter((item) => item.id !== id));
    try {
      await saveHiddenRemoteTaskIds(authUserId, [...hiddenRemoteTaskIds.current]);
    } catch (error) {
      console.warn('Task was hidden in this session but could not be saved locally:', error?.message || error);
    }

    try {
      if (task.whatsappRemote) await deleteWhatsAppTaskFromDatabase(id);
      else if (task.remote) await deleteRemoteDetectionTask(id);
    } catch (error) {
      // Keep the task removed from this app even if Supabase cannot remove its row.
      console.warn('Task remains hidden in this app; Supabase removal failed:', error?.message || error);
    }
  };

  // Completing a task removes its persisted record; it stays in this session's Completed list.
  const handleToggleComplete = async (taskId) => {
    const currentTask = tasks.find((task) => task.id === taskId);
    const isCompleting = !currentTask?.completed;
    if (currentTask?.whatsappRemote && isCompleting) {
      await hideRemoteTaskInApp(currentTask);
      return;
    }
    if (currentTask?.remote && isCompleting) {
      await hideRemoteTaskInApp(currentTask);
      return;
    }
    const nextTasks = tasks.map((task) => task.id === taskId ? { ...task, completed: !task.completed } : task);
    setTasks(nextTasks);
    const task = nextTasks.find((item) => item.id === taskId);
    if (!task) return;

    try {
      if (task.id?.startsWith('task-manual-')) {
        if (isCompleting) {
          if (!task.location_enabled) await removeManualTask(authUserId, taskId);
          if (task.location_enabled) await syncLocationGeofences(authUserId, nextTasks);
          if (authUserId) await deleteCloudManualTask(authUserId, taskId, { requireMatch: false });
        } else {
          if (authUserId) await saveCloudManualTask(authUserId, task);
          if (!task.location_enabled) await saveManualTask(authUserId, task);
          if (task.location_enabled) await syncLocationGeofences(authUserId, nextTasks);
        }
      } else if (task.location_enabled) {
        await syncLocationGeofences(authUserId, nextTasks);
      }
    } catch (error) {
      setTasks(tasks);
      if (isCompleting && task.id?.startsWith('task-manual-') && !task.location_enabled) {
        try { await saveManualTask(authUserId, currentTask); } catch { /* keep the completion error visible */ }
      }
      if (task.location_enabled) {
        try { await syncLocationGeofences(authUserId, tasks); } catch { /* the saved reminder will retry on refresh */ }
      }
      console.error('Could not update task completion:', error);
      Alert.alert('Could not update task', error?.message || 'Please try again.');
      return;
    }

    if (isCompleting && task.location_enabled) {
      cancelLocationTaskNotifications(taskId).catch((error) => {
        console.warn('Could not cancel completed location reminders:', error?.message || error);
      });
    }
  };

  // Save Task (Create new OR Update existing)
  const handleSaveTask = async (taskData) => {
    let nextTasks;
    if (taskToEdit) {
      if (taskToEdit.whatsappRemote && supabase) {
        const { data, error } = await supabase.functions.invoke('whatsapp-task-status', {
          body: { taskId: taskData.id, priority: taskData.priority || 'medium' },
        });
        if (error || !data?.ok) {
          Alert.alert('Could not update task priority', data?.error || error?.message || 'Please try again.');
          return false;
        }
      } else if (taskToEdit.remote && supabase) {
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
          if (authUserId && taskData.id?.startsWith('task-manual-')) await saveCloudManualTask(authUserId, taskData);
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
          const savedTask = { ...taskData, completed: nextTasks.find((task) => task.id === taskData.id)?.completed || false };
          if (authUserId) await saveCloudManualTask(authUserId, savedTask);
          await saveManualTask(authUserId, savedTask);
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
          if (authUserId && taskData.id?.startsWith('task-manual-')) {
            try {
              await saveCloudManualTask(authUserId, taskData);
            } catch (syncError) {
              console.warn('Location task saved on this device but cloud sync failed:', syncError?.message || syncError);
              Alert.alert('Task saved on this phone', 'Cloud sync is temporarily unavailable. Keep this app open or reconnect to sync it.');
            }
          }
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
        // Save locally first so a temporary mobile network issue cannot block task creation.
        await saveManualTask(authUserId, taskData);
        setTasks(nextTasks);
        try {
          if (authUserId) await saveCloudManualTask(authUserId, taskData);
        } catch (error) {
          console.warn('Task saved locally; Supabase sync will retry later:', error?.message || error);
          Alert.alert('Task saved on this phone', 'Cloud sync is temporarily unavailable. Keep this app open or reconnect to sync it.');
        }
      }
      if (taskData.location_enabled) setTasks(nextTasks);
      if (!taskData.location_enabled) {
        Alert.alert('Task Created', `"${taskData.title}" added to your Tasks & Dashboard.`);
      }
    }
    return true;
  };

  // Delete task
  const handleDeleteTask = async (taskId) => {
    const task = tasks.find((item) => item.id === taskId);
    if (task?.whatsappRemote || task?.remote) {
      const restoreStatus = task.status || 'approved';
      try {
        if (task.whatsappRemote) await setWhatsAppTaskStatus(taskId, 'dismissed');
        else await setRemoteDetectionStatus(taskId, 'dismissed');
      } catch (error) {
        Alert.alert('Could not delete task', error?.message || 'Supabase could not delete this task. Please try again.');
        return;
      }
      hiddenRemoteTaskIds.current.add(taskId);
      if (task.whatsappRemote) deletedWhatsAppTaskIds.current.add(taskId);
      setTasks((current) => current.filter((item) => item.id !== taskId));
      setDetections((current) => current.filter((item) => item.id !== taskId));
      try {
        await saveHiddenRemoteTaskIds(authUserId, [...hiddenRemoteTaskIds.current]);
      } catch (error) {
        console.warn('Deleted task could not be added to the local hidden-task cache:', error?.message || error);
      }
      offerUndo('Task deleted', async () => {
        if (task.whatsappRemote) {
          await setWhatsAppTaskStatus(taskId, restoreStatus);
          deletedWhatsAppTaskIds.current.delete(taskId);
        } else {
          await setRemoteDetectionStatus(taskId, restoreStatus);
        }
        hiddenRemoteTaskIds.current.delete(taskId);
        await saveHiddenRemoteTaskIds(authUserId, [...hiddenRemoteTaskIds.current]);
        setTasks((current) => [task, ...current.filter((item) => item.id !== taskId)]);
      }, async () => {
        if (task.whatsappRemote) await deleteWhatsAppTaskFromDatabase(taskId);
        else await deleteRemoteDetectionTask(taskId);
      });
      return;
    }
    try {
      if (task?.id?.startsWith('task-manual-') && authUserId) {
        await deleteCloudManualTask(authUserId, taskId);
      }
      if (task?.id?.startsWith('task-manual-')) {
        await removeManualTask(authUserId, taskId);
      }
    } catch (error) {
      Alert.alert('Could not delete task', error?.message || 'Please try again.');
      return;
    }
    const nextTasks = tasks.filter((item) => item.id !== taskId);
    setTasks(nextTasks);
    if (task?.location_enabled) {
      try {
        await syncLocationGeofences(authUserId, nextTasks);
        await cancelLocationTaskNotifications(taskId);
      } catch (error) {
        Alert.alert('Could not remove location reminder', error?.message || 'Please try again.');
      }
    }
    offerUndo('Task deleted', async () => {
      if (task?.id?.startsWith('task-manual-')) {
        await saveManualTask(authUserId, task);
        if (authUserId) await saveCloudManualTask(authUserId, task);
      }
      const restored = [task, ...tasks.filter((item) => item.id !== taskId)];
      setTasks(restored);
      if (task?.location_enabled) await syncLocationGeofences(authUserId, restored);
    });
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
    if (detection.whatsappRemote) {
      const { data, error } = await supabase.functions.invoke('whatsapp-task-status', {
        body: { taskId: detection.id, status: 'approved' },
      });
      if (error || !data?.ok) {
        Alert.alert('Could not confirm WhatsApp task', data?.error || error?.message || 'Please try again.');
        return;
      }
      approvedWhatsAppTaskIds.current.add(detection.id);
      saveApprovedWhatsAppTaskIds(authUserId, [...approvedWhatsAppTaskIds.current]).catch((storageError) => {
        console.warn('Could not update the local WhatsApp approval cache:', storageError?.message || storageError);
      });
    } else if (detection.remote && supabase) {
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
      id: detection.remote || detection.whatsappRemote ? detection.id : `task-detected-${Date.now()}`,
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
      createdAt: detection.createdAt || new Date().toISOString(),
      sender: detection.sender || detection.sourceChannel,
      actionLabel: detection.source === 'zoom' ? 'Join' : (detection.source === 'whatsapp' ? 'Chat' : undefined),
      remote: Boolean(detection.remote),
      whatsappRemote: Boolean(detection.whatsappRemote),
      original_message: detection.original_message,
      chat_id: detection.chat_id,
      message_id: detection.message_id,
    };

    setTasks(prev => [createdTask, ...prev.filter((task) => task.id !== createdTask.id)]);
    setDetections(prev => prev.filter(d => d.id !== detection.id));
    Alert.alert('Task Added', `"${detection.title}" is now added to your Tasks.`);
  };

  // Dismiss detection
  const handleDismissDetection = async (detectionId) => {
    const detection = detections.find((item) => item.id === detectionId);
    if (detection?.whatsappRemote) {
      try {
        await setWhatsAppTaskStatus(detectionId, 'dismissed');
      } catch (error) {
        Alert.alert('Could not dismiss WhatsApp detection', error?.message || 'Please try again.');
        return;
      }
      dismissedWhatsAppTaskIds.current.add(detectionId);
      saveDismissedWhatsAppTaskIds(authUserId, [...dismissedWhatsAppTaskIds.current]).catch((storageError) => {
        console.warn('Could not update the local WhatsApp dismissal cache:', storageError?.message || storageError);
      });
    } else if (detection?.remote && supabase) {
      const { error } = await supabase.from('pending_inbox_detections')
        .update({ status: 'dismissed' }).eq('id', detectionId).eq('user_id', authUserId);
      if (error) {
        Alert.alert('Could not dismiss detection', error.message);
        return;
      }
    }
    setDetections(prev => prev.filter(d => d.id !== detectionId));
    offerUndo('Detection discarded', async () => {
      if (detection?.whatsappRemote) {
        await setWhatsAppTaskStatus(detectionId, 'pending');
        dismissedWhatsAppTaskIds.current.delete(detectionId);
        await saveDismissedWhatsAppTaskIds(authUserId, [...dismissedWhatsAppTaskIds.current]);
      } else if (detection?.remote) {
        await setRemoteDetectionStatus(detectionId, 'pending');
      }
      setDetections((current) => [detection, ...current.filter((item) => item.id !== detectionId)]);
    }, async () => {
      if (detection?.whatsappRemote) await deleteWhatsAppTaskFromDatabase(detectionId);
      else if (detection?.remote) await deleteRemoteDetectionTask(detectionId);
    });
  };

  // Handle task actions (Join Zoom, Navigate, etc.)
  const handleTaskAction = async (task) => {
    if (task.source === 'zoom') {
      Alert.alert(
        'Launching Zoom Meeting',
        `Topic: ${task.title}\nSchedule: ${task.dueTime}`,
        [{ text: 'Dismiss', style: 'cancel' }, { text: 'Connect Now', onPress: () => {} }]
      );
    } else if (task.source === 'location') {
      const latitude = task.latitude ?? task.location?.latitude;
      const longitude = task.longitude ?? task.location?.longitude;
      const hasCoordinates = latitude !== undefined && latitude !== null && String(latitude).trim() !== ''
        && longitude !== undefined && longitude !== null && String(longitude).trim() !== ''
        && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
      const destination = hasCoordinates
        ? `${latitude},${longitude}`
        : task.location_name || task.location?.placeName || task.tag || '';
      if (!destination) {
        Alert.alert('Location unavailable', 'This task does not have a saved place to navigate to.');
        return;
      }
      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
      try {
        // In embedded/mobile web previews, popup tabs can be blocked silently.
        if (Platform.OS === 'web') {
          window.location.assign(directionsUrl);
          return;
        }
        await Linking.openURL(directionsUrl);
      } catch (error) {
        Alert.alert('Could not open navigation', error?.message || 'Please try again.');
      }
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
  const handleNavigateToTab = (tab, detectionId = null) => {
    setFocusDetectionId(tab === 'detections' ? detectionId : null);
    setCurrentTab(tab);
  };
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
            onNavigateToTab={handleNavigateToTab}
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
            focusDetectionId={focusDetectionId}
            onDetectionFocused={setFocusDetectionId}
            user={userProfile}
            onApproveDetection={handleApproveDetection}
            onDismissDetection={handleDismissDetection}
          />
        );
      case 'places':
        return (
          <PlacesScreen
            user={userProfile}
            tasks={tasks}
            onAddTaskPress={handleOpenCreateModal}
            onAddLocationTask={async (reminder) => {
              const newTask = {
                id: `task-manual-${Date.now()}`,
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
                createdAt: new Date().toISOString(),
                location: {
                  placeName: reminder.placeName,
                  radius: reminder.radius,
                },
                placeReminder: true,
                locationReminderActive: true,
                actionLabel: 'Navigate'
              };
              if (authUserId) await saveCloudManualTask(authUserId, newTask);
              await saveManualTask(authUserId, newTask);
              setTasks(prev => [newTask, ...prev]);
            }}
            onUpdateLocationReminder={async (id, reminder) => {
              const existingTask = tasks.find((task) => task.id === id);
              if (!existingTask) return;
              const updatedTask = {
                ...existingTask,
                title: reminder.title,
                description: reminder.description || `When near ${reminder.placeName}, InBox will remind you.`,
                category: reminder.category || 'Personal',
                tag: reminder.placeName,
                dueTime: `Location Reminder (${reminder.radius})`,
                location: { ...existingTask.location, placeName: reminder.placeName, radius: reminder.radius },
              };
              if (authUserId) await saveCloudManualTask(authUserId, updatedTask);
              await saveManualTask(authUserId, updatedTask);
              setTasks((current) => current.map((task) => task.id === id ? updatedTask : task));
            }}
            onToggleLocationReminder={async (id) => {
              const existingTask = tasks.find((task) => task.id === id);
              if (!existingTask) return;
              const updatedTask = { ...existingTask, locationReminderActive: existingTask.locationReminderActive === false };
              if (authUserId) await saveCloudManualTask(authUserId, updatedTask);
              await saveManualTask(authUserId, updatedTask);
              setTasks((current) => current.map((task) => task.id === id ? updatedTask : task));
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

      {undoToast && (
        <View style={[styles.undoToast, { backgroundColor: darkMode ? '#243249' : '#172033' }]} accessibilityLiveRegion="polite">
          <Text style={styles.undoToastText}>{undoToast}</Text>
          <Pressable onPress={runUndo} accessibilityRole="button" accessibilityLabel="Undo removal" hitSlop={10}>
            <Text style={styles.undoButtonText}>UNDO</Text>
          </Pressable>
        </View>
      )}

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
  undoToast: {
    position: 'absolute',
    zIndex: 20,
    elevation: 12,
    left: 16,
    right: 16,
    bottom: 100,
    minHeight: 54,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  undoToastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
    marginRight: 16,
  },
  undoButtonText: {
    color: '#93C5FD',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
