import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as AuthSession from 'expo-auth-session';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey);

const secureStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        ...(Platform.OS !== 'web' ? { storage: secureStorage } : {}),
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
        flowType: 'pkce',
      },
    })
  : null;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

const pendingCodeExchanges = new Map();

export function getAuthRedirectUri(path = 'auth/callback') {
  if (Platform.OS === 'web') {
    const cleanPath = path.replace(/^\/+/, '');
    return `${window.location.origin}/${cleanPath}`;
  }
  return AuthSession.makeRedirectUri({ scheme: 'inboxapp', path });
}

export async function completeAuthRedirect(url) {
  if (!supabase || !url) return { error: new Error('Supabase is not configured.') };

  const { queryParams = {} } = Linking.parse(url);
  const code = queryParams.code;
  if (typeof code !== 'string') return { data: null, error: null };

  if (pendingCodeExchanges.has(code)) return pendingCodeExchanges.get(code);
  const exchange = supabase.auth.exchangeCodeForSession(code).then((result) => {
    if (result.error) pendingCodeExchanges.delete(code);
    return result;
  });
  pendingCodeExchanges.set(code, exchange);
  return exchange;
}
