import AsyncStorage from '@react-native-async-storage/async-storage';

const getKey = (userId) => `@inbox/whatsapp-review/${userId || 'local'}`;
const getDismissedKey = (userId) => `@inbox/whatsapp-dismissed/${userId || 'local'}`;

export async function loadApprovedWhatsAppTaskIds(userId) {
  try {
    const value = await AsyncStorage.getItem(getKey(userId));
    const ids = value ? JSON.parse(value) : [];
    return Array.isArray(ids) ? ids : [];
  } catch (error) {
    console.warn('Could not load WhatsApp review decisions:', error?.message || error);
    return [];
  }
}

export async function saveApprovedWhatsAppTaskIds(userId, ids) {
  await AsyncStorage.setItem(getKey(userId), JSON.stringify([...new Set(ids)]));
}

export async function loadDismissedWhatsAppTaskIds(userId) {
  try {
    const value = await AsyncStorage.getItem(getDismissedKey(userId));
    const ids = value ? JSON.parse(value) : [];
    return Array.isArray(ids) ? ids : [];
  } catch (error) {
    console.warn('Could not load dismissed WhatsApp detections:', error?.message || error);
    return [];
  }
}

export async function saveDismissedWhatsAppTaskIds(userId, ids) {
  await AsyncStorage.setItem(getDismissedKey(userId), JSON.stringify([...new Set(ids)]));
}
