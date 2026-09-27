import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import UserAvatar from '../components/UserAvatar';
import AppBrand from '../components/AppBrand';

export default function ProfileScreen({ authUser, onSignOut }) {
  const email = authUser?.email || '';
  const displayName = authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || email.split('@')[0] || 'Account';

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.brandHeader}><AppBrand size={38} /></View>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <UserAvatar user={authUser} size={64} />
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userRole}>InBox account</Text>
          <Text style={styles.userEmail}>{email}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>

      {/* About Box */}
      <View style={styles.aboutBox}>
        <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
        <View style={styles.aboutTextGroup}>
          <Text style={styles.aboutTitle}>InBox v1.0.0 — Mobile Architecture</Text>
          <Text style={styles.aboutDesc}>
            Built with React Native for Android & iOS. Local privacy preservation enabled.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 110,
  },
  brandHeader: { marginBottom: 16 },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  signOutText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  profileInfo: {
    marginLeft: 14,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  userRole: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 1,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  syncBanner: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    marginRight: 10,
  },
  syncTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  syncSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  syncButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  syncButtonActive: {
    opacity: 0.7,
  },
  syncBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
    marginBottom: 12,
  },
  sourceItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sourceLeft: {
    flex: 1,
    marginRight: 8,
  },
  sourceDetails: {
    marginTop: 6,
  },
  sourceName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sourceMeta: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  settingRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  settingTextGroup: {
    flex: 1,
    marginRight: 10,
  },
  settingTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  settingSubtitle: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  aboutBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  aboutTextGroup: {
    marginLeft: 10,
    flex: 1,
  },
  aboutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
  },
  aboutDesc: {
    fontSize: 11.5,
    color: '#3B82F6',
    marginTop: 2,
    lineHeight: 15,
  },
});
