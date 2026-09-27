import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function getUserAvatar(user) {
  return user?.avatar
    || user?.user_metadata?.avatar_url
    || user?.user_metadata?.picture
    || null;
}

export function getUserDisplayName(user) {
  return user?.fullName
    || user?.name
    || user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split('@')[0]
    || 'InBox User';
}

export default function UserAvatar({ user, size = 38, onPress, style }) {
  const { theme } = useTheme();
  const avatarUri = getUserAvatar(user);
  const [imageFailed, setImageFailed] = useState(false);
  const initials = getUserDisplayName(user)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  const showImage = Boolean(avatarUri) && !imageFailed;
  const wrapperStyle = [styles.avatar, {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: theme.surfaceVariant,
    borderColor: theme.cardBackground,
  }, style];

  useEffect(() => setImageFailed(false), [avatarUri]);

  const content = showImage ? (
    <Image source={{ uri: avatarUri }} style={styles.image} resizeMode="cover" onError={() => setImageFailed(true)} />
  ) : (
    <Text style={[styles.initials, { color: theme.primary, fontSize: Math.max(12, size * 0.36) }]}>{initials}</Text>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`${getUserDisplayName(user)} profile`} style={wrapperStyle}>{content}</TouchableOpacity>;
  }
  return <View accessibilityRole="image" accessibilityLabel={`${getUserDisplayName(user)} profile picture`} style={wrapperStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  avatar: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  image: { width: '100%', height: '100%' },
  initials: { fontWeight: '800' },
});
