import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

export const GEOFENCE_TASK = 'inbox-location-geofence';
export const LOCATION_NOTIFICATION_CATEGORY = 'LOCATION_REMINDER';
const OWNER_KEY = '@inbox/active-location-reminder-owner';
const recordsKey = (userId) => `@inbox/location-reminders/${userId}`;

async function loadRecords(userId) {
  if (!userId) return [];
  try {
    return JSON.parse((await AsyncStorage.getItem(recordsKey(userId))) || '[]');
  } catch {
    return [];
  }
}

async function saveRecords(userId, records) {
  if (!userId) return;
  await AsyncStorage.setItem(recordsKey(userId), JSON.stringify(records));
}

async function sendLocationNotification(task) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('location-reminders', {
      name: 'Location reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 150, 250],
      sound: 'default',
    });
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Location Reminder',
      body: `You're near ${task.location_name} — ${task.title}.`,
      data: { taskId: task.id, kind: 'location-reminder' },
      categoryIdentifier: LOCATION_NOTIFICATION_CATEGORY,
      ...(Platform.OS === 'android' ? { channelId: 'location-reminders' } : {}),
      sound: 'default',
    },
    trigger: null,
  });
}

if (!TaskManager.isTaskDefined(GEOFENCE_TASK)) {
  TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
    if (error || !data?.region?.identifier) return;
    const userId = await AsyncStorage.getItem(OWNER_KEY);
    if (!userId) return;
    const records = await loadRecords(userId);
    const index = records.findIndex((task) => task.id === data.region.identifier);
    if (index < 0) return;
    const task = records[index];
    if (task.completed || !task.location_enabled) return;

    if (data.eventType === Location.GeofencingEventType.Exit) {
      records[index] = { ...task, inside: false };
      await saveRecords(userId, records);
      return;
    }

    if (data.eventType !== Location.GeofencingEventType.Enter || task.inside) return;
    if (task.triggered && !task.repeatOnReentry) {
      records[index] = { ...task, inside: true };
      await saveRecords(userId, records);
      return;
    }

    records[index] = { ...task, triggered: true, inside: true, triggeredAt: new Date().toISOString() };
    await saveRecords(userId, records);
    await sendLocationNotification(task);
  });
}

export async function requestLocationReminderPermissions({ confirmBackgroundAccess } = {}) {
  if (Platform.OS === 'web') {
    return { granted: false, reason: 'Location reminders require the InBox mobile app.' };
  }

  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') {
    return { granted: false, reason: 'location' };
  }

  const notification = await Notifications.requestPermissionsAsync();
  if (notification.status !== 'granted') {
    return { granted: false, reason: 'notifications' };
  }

  if (confirmBackgroundAccess && !(await confirmBackgroundAccess())) {
    return { granted: false, reason: 'background-cancelled' };
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== 'granted') {
    return { granted: false, reason: 'background' };
  }

  return {
    granted: true,
    approximate: foreground.accuracy === 'coarse' || foreground.accuracy === 'reduced',
  };
}

export async function openLocationSettings() {
  try {
    await Linking.openSettings();
  } catch {
    await Linking.openURL(Platform.OS === 'ios' ? 'app-settings:' : 'app-settings:');
  }
}

export async function setLocationReminderOwner(userId) {
  if (userId) await AsyncStorage.setItem(OWNER_KEY, userId);
  else await AsyncStorage.removeItem(OWNER_KEY);
}

export async function loadLocationTasks(userId) {
  return loadRecords(userId);
}

export async function syncLocationGeofences(userId, tasks) {
  if (Platform.OS === 'web') return { registered: 0, supported: false };
  if (!userId) return { registered: 0, supported: true };
  await setLocationReminderOwner(userId);
  const foregroundPermission = await Location.getForegroundPermissionsAsync();
  const backgroundPermission = await Location.getBackgroundPermissionsAsync();
  if (foregroundPermission.status !== 'granted' || backgroundPermission.status !== 'granted') {
    if (await Location.hasStartedGeofencingAsync(GEOFENCE_TASK)) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
    }
    return { registered: 0, supported: true, permissionMissing: true };
  }
  const activeTasks = (tasks || []).filter((task) => (
    task.location_enabled && !task.completed && Number.isFinite(Number(task.latitude)) && Number.isFinite(Number(task.longitude))
  ));
  const maxRegions = Platform.OS === 'ios' ? 20 : 100;
  if (activeTasks.length > maxRegions) {
    throw new Error(`This device can monitor up to ${maxRegions} location reminders at once.`);
  }

  await Notifications.setNotificationCategoryAsync(LOCATION_NOTIFICATION_CATEGORY, [
    { identifier: 'DONE', buttonTitle: 'Done', options: { opensAppToForeground: true } },
    { identifier: 'DISMISS', buttonTitle: 'Dismiss', options: { opensAppToForeground: true } },
    { identifier: 'SNOOZE', buttonTitle: 'Snooze 15 min', options: { opensAppToForeground: true } },
  ]);
  const previousRecords = await loadRecords(userId);
  const previousById = new Map(previousRecords.map((task) => [task.id, task]));
  const savedLocationTasks = tasks.filter((task) => task.location_enabled).map((task) => {
    const { resetTriggerState, ...record } = task;
    const previous = previousById.get(task.id);
    if (resetTriggerState || !previous) return { ...record, triggered: resetTriggerState ? false : record.triggered, inside: resetTriggerState ? false : record.inside };
    return { ...record, triggered: previous.triggered, inside: previous.inside, triggeredAt: previous.triggeredAt };
  });
  await saveRecords(userId, savedLocationTasks);

  const regions = activeTasks.map((task) => ({
    identifier: String(task.id),
    latitude: Number(task.latitude),
    longitude: Number(task.longitude),
    radius: Number(task.radius) || 1000,
    notifyOnEnter: true,
    notifyOnExit: true,
  }));
  const started = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
  if (regions.length) {
    await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
  } else if (started) {
    await Location.stopGeofencingAsync(GEOFENCE_TASK);
  }
  return { registered: regions.length, supported: true };
}

export async function removeLocationTask(userId, taskId, tasks) {
  const remaining = (tasks || []).filter((task) => task.id !== taskId);
  await syncLocationGeofences(userId, remaining);
}

export async function markLocationTaskDone(userId, taskId, tasks) {
  const currentTasks = (tasks?.length ? tasks : await loadRecords(userId));
  const updated = currentTasks.map((task) => task.id === taskId ? { ...task, completed: true } : task);
  await syncLocationGeofences(userId, updated);
  return updated;
}

export async function snoozeLocationTask(taskId, content = null) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: content?.title || 'Location Reminder',
      body: content?.body || 'Your location reminder is waiting.',
      data: { taskId, kind: 'location-reminder' },
      categoryIdentifier: LOCATION_NOTIFICATION_CATEGORY,
      ...(Platform.OS === 'android' ? { channelId: 'location-reminders' } : {}),
      sound: 'default',
    },
    trigger: { seconds: 15 * 60 },
  });
}

export async function stopLocationGeofencing() {
  if (Platform.OS !== 'web' && await Location.hasStartedGeofencingAsync(GEOFENCE_TASK)) {
    await Location.stopGeofencingAsync(GEOFENCE_TASK);
  }
}

export async function cancelLocationTaskNotifications(taskId) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled
    .filter((notification) => notification.content?.data?.taskId === taskId)
    .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier)));
  const delivered = await Notifications.getPresentedNotificationsAsync();
  await Promise.all(delivered
    .filter((notification) => notification.request?.content?.data?.taskId === taskId)
    .map((notification) => Notifications.dismissNotificationAsync(notification.request.identifier)));
}

export function configureLocationNotificationPresentation() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
