import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function SourceBadge({ source, size = 'normal' }) {
  const normalizedSource = (source || 'manual').toLowerCase();
  const isGmail = normalizedSource === 'gmail';
  const isGoogleCalendar = normalizedSource === 'google calendar';
  const sourceKey = isGmail ? 'email' : isGoogleCalendar ? 'calendar' : normalizedSource;
  const config = colors.sources[sourceKey] || colors.sources.manual;
  const badgeLabel = isGmail ? 'GMAIL' : isGoogleCalendar ? 'GOOGLE CALENDAR' : config.name;

  const renderIcon = () => {
    const iconSize = size === 'small' ? 11 : 13;
    switch (normalizedSource) {
      case 'email':
      case 'gmail':
        return <Ionicons name="mail" size={iconSize} color={config.icon} style={styles.icon} />;
      case 'whatsapp':
        return <Ionicons name="chatbubble-ellipses" size={iconSize} color={config.icon} style={styles.icon} />;
      case 'zoom':
        return <Ionicons name="videocam" size={iconSize} color={config.icon} style={styles.icon} />;
      case 'calendar':
      case 'google calendar':
        return <Ionicons name="calendar" size={iconSize} color={config.icon} style={styles.icon} />;
      case 'location':
        return <Ionicons name="location-sharp" size={iconSize} color={config.icon} style={styles.icon} />;
      default:
        return <Ionicons name="layers" size={iconSize} color={config.icon} style={styles.icon} />;
    }
  };

  return (
    <View style={[
      styles.badge, 
      { backgroundColor: config.bg, borderColor: config.border },
      size === 'small' && styles.badgeSmall
    ]}>
      {renderIcon()}
      <Text style={[
        styles.badgeText, 
        { color: config.text },
        size === 'small' && styles.badgeTextSmall
      ]}>
        {badgeLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  icon: {
    marginRight: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  badgeTextSmall: {
    fontSize: 9.5,
    letterSpacing: 0.4,
  },
});
