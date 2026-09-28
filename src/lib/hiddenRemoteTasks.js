import AsyncStorage from '@react-native-async-storage/async-storage';

const getKey = (userId) => `@inbox/hidden-remote-tasks/${userId || 'local'}`;

export async function loadHiddenRemoteTaskIds(userId) {
  try {
    const value = await AsyncStorage.getItem(getKey(userId));
    const ids = value ? JSON.parse(value) : [];
    return Array.isArray(ids) ? ids : [];
  } catch (error) {
    console.warn('Could not load locally hidden tasks:', error?.message || error);
    return [];
  }
}

export async function saveHiddenRemoteTaskIds(userId, ids) {
  await AsyncStorage.setItem(getKey(userId), JSON.stringify([...new Set(ids)]));
}
