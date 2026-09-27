import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import UserAvatar from './UserAvatar';
import AppBrand from './AppBrand';

export default function Header({ user, onProfilePress }) {
  const { theme } = useTheme();
  const todayDateStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric',
  });
  const firstName = user?.name || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top row with Logo, Sync status and Avatar */}
      <View style={styles.topRow}>
        <AppBrand size={38} />

        <UserAvatar user={user} size={38} onPress={onProfilePress} />
      </View>

      {/* Greeting and Date Header */}
      <View style={styles.greetingSection}>
        <Text style={[styles.dateLabel, { color: theme.textSecondary }]}>{todayDateStr}</Text>
        <Text style={[styles.greetingTitle, { color: theme.textPrimary }]}>{greeting}, {firstName}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: colors.background,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 2,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  syncText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  greetingSection: {
    marginTop: 18,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  greetingTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: 2,
  },
});
