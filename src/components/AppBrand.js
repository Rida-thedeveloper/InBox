import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export default function AppBrand({ size = 42, style }) {
  const { theme } = useTheme();
  const nameSize = Math.round(size * 0.55);

  return (
    <View style={[styles.container, style]} accessibilityRole="image" accessibilityLabel="InBox">
      <View style={[styles.logo, { width: size, height: size, borderRadius: Math.round(size * 0.27) }]}>
        <Ionicons name="mail" size={Math.round(size * 0.53)} color="#FFFFFF" />
        <View style={[styles.notificationDot, { width: Math.max(7, size * 0.18), height: Math.max(7, size * 0.18), borderRadius: size }]} />
      </View>
      <Text style={[styles.wordmark, { color: theme.textPrimary, fontSize: nameSize }]}>InBox</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: {
    backgroundColor: '#1A56DB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 5,
    elevation: 4,
  },
  notificationDot: {
    position: 'absolute',
    top: '13%',
    right: '13%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#1A56DB',
  },
  wordmark: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontWeight: '900',
    letterSpacing: -0.7,
  },
});
