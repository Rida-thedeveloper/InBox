import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SourceBadge from './SourceBadge';
import { colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { getWhatsAppContactName } from '../lib/whatsappSender';

export default function TaskCard({ task, onToggleComplete, onPress, onActionPress }) {
  const { darkMode, theme } = useTheme();
  const isCompleted = task.completed;
  const whatsappContactName = task.source === 'whatsapp' ? getWhatsAppContactName(task.sender) : null;

  const handleAction = () => {
    if (onActionPress) {
      onActionPress(task);
    } else {
      if (task.source === 'zoom') {
        Alert.alert('Zoom Meeting', `Connecting to meeting: ${task.meetingId || '829 4019 3320'}`);
      } else if (task.source === 'location') {
        Alert.alert('Location Alert', `Opening directions to ${task.tag || 'saved location'}`);
      } else if (task.source === 'whatsapp') {
        Alert.alert('WhatsApp Chat', `Opening discussion thread with ${task.sender || 'Team'}`);
      } else {
        Alert.alert('Task Info', task.description || task.title);
      }
    }
  };

  const getDueIcon = () => {
    if (task.location_enabled || task.source === 'location') {
      return <Ionicons name="location-outline" size={13} color={theme.textSecondary} style={styles.clockIcon} />;
    }
    return <Ionicons name="time-outline" size={13} color={theme.textSecondary} style={styles.clockIcon} />;
  };

  return (
    <View
      style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }, isCompleted && (darkMode ? { backgroundColor: theme.surfaceVariant } : styles.cardCompleted)]}
    >
      {/* Checkbox trigger */}
      <TouchableOpacity 
        style={styles.checkboxTouch} 
        activeOpacity={0.7}
        onPress={() => onToggleComplete(task.id)}
      >
        <View style={[styles.circleCheck, isCompleted && styles.circleChecked]}>
          {isCompleted && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
        </View>
      </TouchableOpacity>

      {/* Task Information */}
      <TouchableOpacity
        style={styles.contentColumn}
        activeOpacity={0.88}
        onPress={() => onPress && onPress(task)}
      >
        {/* Source Badge */}
        <View style={styles.sourceRow}>
          <SourceBadge source={task.source} />
        </View>

        {/* Title */}
        <Text 
          style={[styles.title, { color: theme.textPrimary }, isCompleted && styles.titleCompleted]}
          numberOfLines={2}
        >
          {task.title}
        </Text>

        {task.source === 'whatsapp' && (
          <Text style={[styles.whatsappSenderText, { color: theme.textSecondary }, isCompleted && styles.textCompleted]} numberOfLines={1}>
            {whatsappContactName ? `WhatsApp · ${whatsappContactName}` : 'WhatsApp'}
          </Text>
        )}

        {/* Due Time & Tag */}
        <View style={styles.metaRow}>
          {getDueIcon()}
          <Text style={[styles.dueText, { color: theme.textSecondary }, isCompleted && styles.textCompleted]} numberOfLines={1}>
            {task.location_enabled ? `Near: ${task.location_name}` : task.dueTime}
          </Text>
          {!task.location_enabled && task.tag && (
            <>
              <Text style={styles.dotSeparator}>•</Text>
              <Text style={[styles.tagText, { color: theme.textSecondary }, isCompleted && styles.textCompleted]} numberOfLines={1}>
                {task.tag}
              </Text>
            </>
          )}
        </View>
        {task.location_enabled && (
          <View style={[styles.metaRow, styles.locationMetaRow]}>
            <Ionicons name="radio-button-on-outline" size={12} color={theme.textSecondary} style={styles.clockIcon} />
            <Text style={[styles.locationMetaText, isCompleted && styles.textCompleted]}>
              Radius: {task.radius === 500 ? '500 m' : task.radius === 2000 ? '2 km' : '1 km'}
            </Text>
            <Text style={styles.dotSeparator}>•</Text>
            <Text style={[styles.locationMetaText, isCompleted && styles.textCompleted]}>{task.category || task.tag || 'Personal'}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Action Button (e.g. Join for Zoom, Navigate for Location, etc.) */}
      {task.actionLabel && !isCompleted && (
        <TouchableOpacity 
          style={[
            styles.actionButton, 
            task.source === 'zoom' && styles.zoomButton,
            task.source === 'location' && styles.locationButton
          ]} 
          activeOpacity={0.8}
          onPress={handleAction}
        >
          <Text style={styles.actionButtonText}>{task.actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginHorizontal: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardCompleted: {
    backgroundColor: '#F8FAFC',
    borderColor: '#EEF2F6',
    opacity: 0.75,
  },
  checkboxTouch: {
    padding: 4,
    marginRight: 8,
  },
  circleCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  circleChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  contentColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  sourceRow: {
    marginBottom: 5,
  },
  title: {
    fontSize: 15.5,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 5,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  whatsappSenderText: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  clockIcon: {
    marginRight: 4,
  },
  locationMetaRow: {
    marginTop: 4,
  },
  locationMetaText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  dueText: {
    fontSize: 12.5,
    color: '#E02424', // Reddish tint like in mockup "Today, 6:00 PM"
    fontWeight: '600',
  },
  dotSeparator: {
    marginHorizontal: 6,
    color: '#94A3B8',
    fontSize: 12,
  },
  tagText: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
    flexShrink: 1,
  },
  textCompleted: {
    color: '#94A3B8',
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 10,
    alignSelf: 'center',
  },
  zoomButton: {
    backgroundColor: '#2563EB',
  },
  locationButton: {
    backgroundColor: '#059669',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
