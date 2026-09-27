import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function CognitiveAssistBanner({ pendingCount = 0, onReviewPress }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name="creation" size={22} color="#FFFFFF" />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.badgeLabel}>COGNITIVE ASSIST</Text>
        <Text style={styles.mainTitle}>
          {pendingCount} pending detected task{pendingCount > 1 ? 's' : ''}
        </Text>
      </View>

      <TouchableOpacity 
        style={styles.reviewButton} 
        activeOpacity={0.8} 
        onPress={onReviewPress}
      >
        <Text style={styles.reviewButtonText}>Review</Text>
        <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={styles.arrowIcon} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#131C2E',
    borderRadius: 16,
    marginHorizontal: 18,
    marginTop: 14,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34D399', // mint green highlight
    letterSpacing: 0.8,
  },
  mainTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
    lineHeight: 18,
  },
  reviewButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  arrowIcon: {
    marginLeft: 4,
  },
});
