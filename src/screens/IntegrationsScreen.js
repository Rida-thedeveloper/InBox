import React from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import UserAvatar, { getUserDisplayName } from '../components/UserAvatar';
import AppBrand from '../components/AppBrand';

const providers = [
  { id: 'gmail', name: 'Gmail', detail: 'Email read-only access', icon: 'mail-outline', iconSet: 'ion', tint: '#2563EB', background: '#E0E7FF' },
  { id: 'whatsapp', name: 'WhatsApp', detail: 'Task detection from messages', icon: 'logo-whatsapp', iconSet: 'ion', tint: '#059669', background: '#D1FAE5' },
  { id: 'calendar', name: 'Calendar', detail: 'Google Calendar event sync', icon: 'calendar-outline', iconSet: 'ion', tint: '#7C3AED', background: '#EDE9FE' },
];

function SectionLabel({ children, right, darkMode }) {
  return <View style={styles.sectionLabelRow}><Text style={[styles.sectionLabel, darkMode && { color: '#A7B4C8' }]}>{children}</Text>{right ? <Text style={styles.sectionPill}>{right}</Text> : null}</View>;
}

export default function IntegrationsScreen({ authUser, onSignOut, gmailConnection, gmailBusy, onConnectGmail, onDisconnectGmail }) {
  const { darkMode, toggleDarkMode, theme } = useTheme();
  const explainConnect = (provider) => {
    Alert.alert(`${provider.name} integration`, `${provider.name} sync is managed through your existing InBox workflow.`, [{ text: 'Got it' }]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.appHeader}>
        <View style={styles.brandRow}>
          <View style={styles.brandStack}>
            <AppBrand size={38} />
            <View style={[styles.syncBadge, { backgroundColor: theme.surfaceVariant }]}><View style={styles.syncDot} /><Text style={[styles.syncText, { color: theme.textSecondary }]}>Connect accounts to sync</Text></View>
          </View>
        </View>
        <View style={styles.accountIdentity}>
          <Text style={[styles.accountName, { color: theme.textPrimary }]} numberOfLines={1}>{getUserDisplayName(authUser)}</Text>
          <UserAvatar user={authUser} size={36} onPress={() => Alert.alert('Account', authUser?.email || 'Signed in')} />
        </View>
      </View>

      <Text style={[styles.title, { color: theme.textPrimary }]}>Settings</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Simple controls for automation & privacy.</Text>

      <SectionLabel right={`${gmailConnection?.connected ? 1 : 0} connected`} darkMode={darkMode}>CONNECTED APPS</SectionLabel>
      <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        {providers.map((provider, index) => {
          const Icon = provider.iconSet === 'mci' ? MaterialCommunityIcons : Ionicons;
          const isConnected = provider.id === 'gmail' ? Boolean(gmailConnection?.connected) : false;
          const rowSubtitle = provider.id === 'gmail'
            ? (gmailBusy ? 'Connecting securely…' : isConnected ? (gmailConnection.email || 'Connected • Gmail read access') : provider.detail)
            : provider.detail;
          const onPress = provider.id === 'gmail'
            ? (isConnected ? onDisconnectGmail : onConnectGmail)
            : () => explainConnect(provider);
          return (
              <View key={provider.id} style={[styles.row, { borderBottomColor: theme.border }, index === providers.length - 1 && styles.lastRow]}>
              <View style={[styles.iconBox, { backgroundColor: provider.background }]}><Icon name={provider.icon} size={19} color={provider.tint} /></View>
              <View style={styles.rowText}><Text style={[styles.rowTitle, { color: theme.textPrimary }]}>{provider.name}</Text><Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>{rowSubtitle}</Text></View>
              <TouchableOpacity style={[styles.connectButton, isConnected && styles.connectedButton, gmailBusy && provider.id === 'gmail' && styles.busyButton]} disabled={gmailBusy && provider.id === 'gmail'} onPress={onPress}>
                <Text style={[styles.connectText, isConnected && styles.connectedText]}>{gmailBusy && provider.id === 'gmail' ? 'Please wait' : isConnected ? 'Disconnect' : 'Connect'}</Text>
                <Ionicons name={isConnected ? 'checkmark-circle' : 'arrow-forward-circle-outline'} size={17} color={isConnected ? '#059669' : colors.primary} />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <SectionLabel darkMode={darkMode}>APPEARANCE</SectionLabel>
      <View style={[styles.card, styles.appearanceCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: darkMode ? '#263750' : '#E0E7FF' }]}><Ionicons name={darkMode ? 'moon' : 'sunny'} size={19} color={colors.primary} /></View>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Dark mode</Text>
            <Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>Use a darker look across InBox</Text>
          </View>
          <Switch value={darkMode} onValueChange={toggleDarkMode} trackColor={{ false: '#CBD5E1', true: '#60A5FA' }} thumbColor={darkMode ? '#FFFFFF' : '#F8FAFC'} accessibilityLabel="Dark mode" />
        </View>
      </View>

      <SectionLabel darkMode={darkMode}>APPROVAL & ACCOUNT</SectionLabel>
      <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: '#DBEAFE' }]}><Ionicons name="shield-checkmark-outline" size={19} color={colors.primary} /></View>
          <View style={styles.rowText}><Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Review before adding</Text><Text style={[styles.rowSubtitle, { color: theme.textSecondary }]}>Detected items stay pending until you approve or dismiss them.</Text></View>
        </View>
        {onSignOut ? <TouchableOpacity style={[styles.signOut, { borderTopColor: theme.border }]} onPress={onSignOut}><Ionicons name="log-out-outline" size={17} color={theme.textSecondary} /><Text style={[styles.signOutText, { color: theme.textSecondary }]}>Sign out{authUser?.email ? ` · ${authUser.email}` : ''}</Text></TouchableOpacity> : null}
      </View>
      <Text style={[styles.footnote, { color: theme.textMuted }]}>Your mail and meeting data will only be scanned after you connect an account and approve access.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 118 },
  appHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  accountIdentity: { flexDirection: 'row', alignItems: 'center', gap: 9, maxWidth: '55%' },
  accountName: { maxWidth: 140, fontSize: 13, fontWeight: '700' },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  brandStack: { alignItems: 'flex-start' },
  syncBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 10, backgroundColor: '#F1F5F9', marginTop: 2 },
  syncDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#F59E0B', marginRight: 4 },
  syncText: { fontSize: 10, color: colors.textSecondary, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.4 },
  subtitle: { fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginTop: 3, marginBottom: 20 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 3, marginBottom: 7, marginTop: 1 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: colors.textSecondary },
  sectionPill: { fontSize: 9, fontWeight: '700', color: '#059669', backgroundColor: '#D1FAE5', borderRadius: 9, paddingVertical: 3, paddingHorizontal: 7 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 20, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  appearanceCard: { marginBottom: 20 },
  row: { minHeight: 66, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8ECF2', paddingVertical: 9 },
  lastRow: { borderBottomWidth: 0 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowText: { flex: 1, paddingRight: 5 },
  rowTitle: { color: colors.textPrimary, fontSize: 14, lineHeight: 19, fontWeight: '700' },
  rowSubtitle: { color: colors.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 2 },
  connectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderColor: '#DBEAFE', backgroundColor: '#EFF6FF', borderRadius: 18, paddingHorizontal: 11, paddingVertical: 8 },
  connectText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  connectedButton: { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' },
  busyButton: { opacity: 0.6 },
  connectedText: { color: '#059669' },
  quietWindow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 6, marginLeft: 43, marginRight: 1, marginTop: -3, marginBottom: 4, gap: 5 },
  quietText: { color: '#334155', fontSize: 8, fontWeight: '600' },
  quietTime: { color: colors.primary, fontSize: 8, fontWeight: '700', marginLeft: 'auto' },
  actionDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E8ECF2', marginLeft: 42 },
  actionRow: { minHeight: 35, flexDirection: 'row', alignItems: 'center', gap: 6 },
  resetText: { color: '#DC2626', fontSize: 10, fontWeight: '600' },
  auditText: { color: colors.primary, fontSize: 10, fontWeight: '600' },
  signOut: { minHeight: 42, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E8ECF2', flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 },
  signOutText: { color: colors.textSecondary, fontSize: 12 },
  footnote: { fontSize: 11, lineHeight: 16, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 12, marginTop: -5 },
});
