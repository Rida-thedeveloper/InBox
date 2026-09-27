import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

export default function FilterPills({ activeFilter, onSelectFilter, counts }) {
  const { darkMode, theme } = useTheme();
  const filters = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'today', label: 'Today', count: counts.today },
    { id: 'upcoming', label: 'Upcoming', count: counts.upcoming },
    { id: 'pending', label: 'Detections', count: counts.pending },
    { id: 'completed', label: 'Completed', count: counts.completed },
  ];

  return (
    <View style={styles.wrapper}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {filters.map((filter) => {
          const isActive = activeFilter === filter.id;
          return (
            <TouchableOpacity
              key={filter.id}
              activeOpacity={0.8}
              onPress={() => onSelectFilter(filter.id)}
              style={[styles.pill, isActive ? styles.pillActive : styles.pillInactive, darkMode && !isActive && { backgroundColor: theme.surfaceVariant }]}
            >
              <Text style={[styles.pillText, isActive ? styles.pillTextActive : styles.pillTextInactive, darkMode && !isActive && { color: theme.textPrimary }]}>
                {filter.label}
              </Text>
              {filter.count !== undefined && filter.count > 0 && (
                <View style={[styles.countBadge, isActive ? styles.countBadgeActive : styles.countBadgeInactive]}>
                  <Text style={[styles.countText, isActive ? styles.countTextActive : styles.countTextInactive]}>
                    {filter.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 6,
  },
  container: {
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: '#0F172A', // Dark black/navy matching mockup
  },
  pillInactive: {
    backgroundColor: '#E0E7FF', // Soft pill background
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  pillTextInactive: {
    color: '#374151',
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 6,
  },
  countBadgeActive: {
    backgroundColor: '#334155',
  },
  countBadgeInactive: {
    backgroundColor: '#CBD5E1',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
  countTextActive: {
    color: '#FFFFFF',
  },
  countTextInactive: {
    color: '#1E293B',
  },
});
