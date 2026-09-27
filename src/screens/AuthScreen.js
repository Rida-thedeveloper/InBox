import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { colors } from '../theme/colors';
import AppBrand from '../components/AppBrand';
import { completeAuthRedirect, getAuthRedirectUri, hasSupabaseConfig, supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen({ onAuthenticated, recoveryMode = false, onRecoveryComplete }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    if (recoveryMode) setMode('recovery');
  }, [recoveryMode]);

  const isSignup = mode === 'signup';
  const isRecovery = mode === 'recovery';

  const submit = async () => {
    if (isSignup && !name.trim()) {
      Alert.alert('Name required', 'Please enter your name to create an account.');
      return;
    }
    if (!isRecovery && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      Alert.alert('Check your email', 'Enter a valid email address to continue.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters for your password.');
      return;
    }
    if ((isSignup || isRecovery) && password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Check both password fields and try again.');
      return;
    }

    if (!hasSupabaseConfig || !supabase) {
      Alert.alert('Supabase not configured', 'Add your Supabase URL and publishable key to the project .env file, then restart Expo.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRecovery) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        Alert.alert('Password updated', 'Your password has been changed.');
        onRecoveryComplete?.();
      } else if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: getAuthRedirectUri(),
          },
        });
        if (error) throw error;
        if (data.session) {
          onAuthenticated?.(data.session);
        } else {
          Alert.alert('Verify your email', 'Supabase sent a confirmation link to your inbox. Open it to finish creating your account.');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        onAuthenticated?.(data.session);
      }
    } catch (error) {
      Alert.alert(isRecovery ? 'Could not update password' : isSignup ? 'Could not create account' : 'Could not sign in', error.message || 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    if (!hasSupabaseConfig || !supabase) {
      Alert.alert('Supabase not configured', 'Add your Supabase URL and publishable key to the project .env file, then restart Expo.');
      return;
    }

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
      Alert.alert('Google sign-in failed', error.message || 'Please check the Google provider settings in Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      Alert.alert('Enter your email first', 'Add the email address for your account, then tap Forgot password again.');
      return;
    }
    if (!supabase) {
      Alert.alert('Supabase not configured', 'Add your Supabase URL and publishable key to the project .env file, then restart Expo.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getAuthRedirectUri('auth/reset-password'),
      });
      if (error) throw error;
      Alert.alert('Check your email', 'If an account exists for this address, Supabase sent a password reset link.');
    } catch (error) {
      Alert.alert('Could not send reset link', error.message || 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <AppBrand size={38} />
          <View style={styles.secureLabel}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.success} />
            <Text style={styles.secureText}>Your space, organized</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroMark}>
            <Ionicons name="checkmark-done" size={30} color={colors.primary} />
          </View>
          <Text style={styles.eyebrow}>A calmer way to stay on top</Text>
          <Text style={styles.title}>{isRecovery ? 'Choose a new password' : isSignup ? 'Create your account' : 'Welcome back'}</Text>
          <Text style={styles.subtitle}>
            {isRecovery
              ? 'Use a new password of at least 8 characters.'
              : isSignup
              ? 'Bring your tasks, reminders, and plans together.'
              : 'Sign in to pick up right where you left off.'}
          </Text>
        </View>

        <View style={styles.formCard}>
          {!isRecovery && (
            <Pressable style={styles.googleButton} onPress={handleGoogle} disabled={isSubmitting}>
              <FontAwesome name="google" size={18} color="#4285F4" />
              <Text style={styles.googleText}>Continue with Google</Text>
            </Pressable>
          )}

          {!isRecovery && (
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or continue with email</Text>
              <View style={styles.divider} />
            </View>
          )}

          {isSignup && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full name</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={18} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  textContentType="name"
                />
              </View>
            </View>
          )}

          {!isRecovery && <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email address</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
              />
            </View>
          </View>}

          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{isRecovery ? 'New password' : 'Password'}</Text>
              {!isSignup && !isRecovery && (
              <Pressable onPress={handleForgotPassword} disabled={isSubmitting}>
                  <Text style={styles.linkSmall}>Forgot password?</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder={isSignup || isRecovery ? 'At least 8 characters' : 'Enter your password'}
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!passwordVisible}
                autoCapitalize="none"
                autoComplete={isSignup || isRecovery ? 'new-password' : 'current-password'}
                textContentType={isSignup || isRecovery ? 'newPassword' : 'password'}
              />
              <Pressable onPress={() => setPasswordVisible(!passwordVisible)} hitSlop={8}>
                <Ionicons name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>

          {(isSignup || isRecovery) && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter your password"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!passwordVisible}
                  autoCapitalize="none"
                  textContentType="newPassword"
                />
              </View>
            </View>
          )}

          <Pressable style={({ pressed }) => [styles.submitButton, pressed && styles.pressed, isSubmitting && styles.disabled]} onPress={submit} disabled={isSubmitting}>
          <Text style={styles.submitText}>{isSubmitting ? 'Please wait…' : isRecovery ? 'Update password' : isSignup ? 'Create account' : 'Sign in'}</Text>
            {!isSubmitting && <Ionicons name="arrow-forward" size={18} color="#fff" />}
          </Pressable>

          {!isRecovery && <View style={styles.switchRow}>
            <Text style={styles.switchPrompt}>
              {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            </Text>
            <Pressable onPress={() => setMode(isSignup ? 'login' : 'signup')}>
              <Text style={styles.switchLink}>{isSignup ? 'Sign in' : 'Sign up'}</Text>
            </Pressable>
          </View>}
        </View>

        <Text style={styles.terms}>
          By continuing, you agree to InBox’s <Text style={styles.termsLink}>Terms of Service</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 22, paddingBottom: 30 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  secureLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  secureText: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  hero: { alignItems: 'center', marginTop: 34, marginBottom: 24 },
  heroMark: { width: 62, height: 62, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight, marginBottom: 17 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 8 },
  title: { color: colors.textPrimary, fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8, maxWidth: 280 },
  formCard: { backgroundColor: colors.cardBackground, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: colors.borderLight, shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 2 },
  googleButton: { height: 50, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11 },
  googleText: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 21 },
  divider: { flex: 1, height: 1, backgroundColor: colors.borderLight },
  dividerText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  fieldGroup: { marginBottom: 15 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  label: { color: colors.textPrimary, fontSize: 12, fontWeight: '700', marginBottom: 7 },
  linkSmall: { color: colors.primary, fontSize: 11, fontWeight: '700', marginBottom: 7 },
  inputWrap: { height: 49, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: '#fff' },
  input: { flex: 1, color: colors.textPrimary, fontSize: 13, paddingVertical: 0 },
  submitButton: { height: 51, borderRadius: 13, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 3, shadowColor: colors.primary, shadowOpacity: 0.2, shadowRadius: 9, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.65 },
  submitText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  switchPrompt: { color: colors.textSecondary, fontSize: 12 },
  switchLink: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  terms: { color: colors.textMuted, fontSize: 10, lineHeight: 16, textAlign: 'center', marginTop: 20, paddingHorizontal: 12 },
  termsLink: { color: colors.textSecondary, fontWeight: '700' },
});
