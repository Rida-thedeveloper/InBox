import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

export default function BottomNavigation({ currentTab, onTabSelect, detectionCount = 3, onAddTaskPress }) {
  const { darkMode, theme } = useTheme();
  const tabs = [
    {
      id: 'home',
      label: 'Home',
      icon: 'home-outline',
      activeIcon: 'home',
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: 'checkmark-circle-outline',
      activeIcon: 'checkmark-circle',
    },
    {
      id: 'detections',
      label: 'Detections',
      icon: 'mail-unread-outline',
      activeIcon: 'mail-unread',
      badge: detectionCount,
    },
    {
      id: 'places',
      label: 'Places',
      icon: 'location-outline',
      activeIcon: 'location',
    },
    {
      id: 'profile',
      label: 'Integrations',
      icon: 'options-outline',
      activeIcon: 'options',
    },
  ];

  return (
    <>
      {/* Floating + Add Task button */}
      <TouchableOpacity
        style={[styles.fabButton, { backgroundColor: darkMode ? '#2563EB' : '#0F172A' }]}
        activeOpacity={0.85}
        onPress={onAddTaskPress}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Bottom Bar */}
      <View style={[styles.tabBar, { backgroundColor: theme.cardBackground, borderTopColor: theme.border }]}>
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              activeOpacity={0.7}
              onPress={() => onTabSelect(tab.id)}
            >
              <View style={styles.iconWrapper}>
                <Ionicons
                  name={isActive ? tab.activeIcon : tab.icon}
                  size={24}
                  color={isActive ? colors.primary : theme.textSecondary}
                />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <View style={[styles.badgeContainer, { borderColor: theme.cardBackground }]}>
                    <Text style={styles.badgeText}>{tab.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, isActive ? styles.tabLabelActive : [styles.tabLabelInactive, { color: theme.textSecondary }]]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fabButton: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 96 : 80,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#0F172A', // Dark stylish FAB matching screenshot
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 99,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28,
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: colors.primary,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 3,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: '#64748B',
  },
});
