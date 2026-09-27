import AsyncStorage from '@react-native-async-storage/async-storage';

const getStorageKey = (userId) => `@inbox/manual-tasks/${userId || 'local'}`;

export async function loadManualTasks(userId) {
  try {
    const stored = await AsyncStorage.getItem(getStorageKey(userId));
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Could not load manually created tasks:', error?.message || error);
    return [];
  }
}

export async function saveManualTask(userId, task) {
  const tasks = await loadManualTasks(userId);
  const nextTasks = [task, ...tasks.filter((item) => item.id !== task.id)];
  await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(nextTasks));
}

export async function removeManualTask(userId, taskId) {
  const tasks = await loadManualTasks(userId);
  await AsyncStorage.setItem(
    getStorageKey(userId),
    JSON.stringify(tasks.filter((task) => task.id !== taskId)),
  );
}
