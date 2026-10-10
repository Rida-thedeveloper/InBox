import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import AppBrand from '../components/AppBrand';
import { completeAuthRedirect, getAuthRedirectUri, hasSupabaseConfig, supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen({ onAuthenticated }) {
  const { theme, darkMode } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error_code') || params.get('error');
    if (!oauthError) return;

    setNotice({
      type: 'error',
      text: 'Google sign-in could not be completed. Tap Continue with Google to try again. If this keeps happening, check the Google OAuth callback settings in Supabase and Google Cloud.',
    });
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.hash}`);
  }, []);

  const handleGoogle = async () => {
    if (!hasSupabaseConfig || !supabase) {
      setNotice({ type: 'error', text: 'Supabase is not configured. Check the project environment settings.' });
      return;
    }

    setNotice(null);
    setIsSubmitting(true);
    try {
      const redirectTo = getAuthRedirectUri();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: Platform.OS !== 'web',
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) throw error;

      if (Platform.OS !== 'web' && data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === 'success' && result.url) {
          const completed = await completeAuthRedirect(result.url);
          if (completed.error) throw completed.error;
          if (!completed.data?.session) throw new Error('Google sign-in did not return a session.');
          onAuthenticated?.(completed.data.session);
        }
      }
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Google sign-in failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <AppBrand size={46} />
          <View style={styles.secureLabel}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.success} />
            <Text style={[styles.secureText, { color: theme.textSecondary }]}>Private and secure</Text>
          </View>
        </View>

        <View style={styles.mainContent}>
          <View style={styles.hero}>
            <View style={[styles.heroMark, { backgroundColor: theme.surfaceVariant }]}>
              <Ionicons name="checkmark-done" size={30} color={colors.primary} />
            </View>
            <Text style={styles.eyebrow}>A calmer way to stay on top</Text>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Welcome to InBox</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Sign in securely with your Google account to continue.
            </Text>
          </View>

          <View style={[styles.formCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          {notice && (
            <View
              style={[
                styles.notice,
                notice.type === 'error'
                  ? { backgroundColor: darkMode ? '#351C24' : '#FEF2F2', borderColor: darkMode ? '#71333D' : '#FECACA' }
                  : { backgroundColor: darkMode ? '#163326' : '#F0FDF4', borderColor: darkMode ? '#28583E' : '#BBF7D0' },
              ]}
              accessibilityRole="alert"
            >
              <Text style={[styles.noticeText, { color: notice.type === 'error' ? '#B91C1C' : '#166534' }]}>{notice.text}</Text>
            </View>
          )}
          <Pressable
            style={[
              styles.googleButton,
              { backgroundColor: darkMode ? theme.surfaceVariant : '#FFFFFF', borderColor: theme.border },
              isSubmitting && styles.disabled,
            ]}
            onPress={handleGoogle}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={theme.textPrimary} />
            ) : (
              <FontAwesome name="google" size={18} color="#4285F4" />
            )}
            <Text style={[styles.googleText, { color: theme.textPrimary }]}>
              {isSubmitting ? 'Connecting…' : 'Continue with Google'}
            </Text>
          </Pressable>
          </View>

          <Text style={[styles.terms, { color: theme.textMuted }]}>
            By continuing, you agree to InBox’s <Text style={[styles.termsLink, { color: theme.textSecondary }]}>Terms of Service</Text> and <Text style={[styles.termsLink, { color: theme.textSecondary }]}>Privacy Policy</Text>.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'flex-start', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 30 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 },
  mainContent: { flexGrow: 1, justifyContent: 'center' },
  secureLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  secureText: { fontSize: 11, fontWeight: '600' },
  hero: { alignItems: 'center', marginBottom: 26 },
  heroMark: { width: 62, height: 62, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginBottom: 17 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 8 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.8, textAlign: 'center' },
  subtitle: { fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8, maxWidth: 280 },
  formCard: { borderRadius: 22, padding: 20, borderWidth: 1, shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 2 },
  notice: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 15 },
  noticeText: { fontSize: 12, lineHeight: 18 },
  googleButton: { height: 52, borderRadius: 13, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11 },
  googleText: { fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.65 },
  terms: { fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 20, paddingHorizontal: 12 },
  termsLink: { fontWeight: '700' },
});
