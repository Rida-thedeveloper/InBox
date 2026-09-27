import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AddLocationReminderModal from '../components/AddLocationReminderModal';
import { colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import AppBrand from '../components/AppBrand';
import UserAvatar from '../components/UserAvatar';

export default function PlacesScreen({ onAddLocationTask, user }) {
  const { darkMode, theme } = useTheme();
  const [reminders, setReminders] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reminderToEdit, setReminderToEdit] = useState(null);

  const toggleReminderActive = (id) => {
    setReminders(prev =>
      prev.map(r => r.id === id ? { ...r, active: !r.active } : r)
    );
  };

  const handleSaveReminder = (savedReminder) => {
    if (reminderToEdit) {
      setReminders(prev =>
        prev.map(r => r.id === savedReminder.id ? { ...r, ...savedReminder } : r)
      );
      Alert.alert('Reminder Updated', `"${savedReminder.title}" updated.`);
    } else {
      setReminders(prev => [savedReminder, ...prev]);
      Alert.alert('Reminder Created', `"${savedReminder.title}" added.`);
      
      if (onAddLocationTask) {
        onAddLocationTask(savedReminder);
      }
    }
    setReminderToEdit(null);
  };

  const handleOpenEdit = (reminder) => {
    setReminderToEdit(reminder);
    setIsModalOpen(true);
  };

  const activeZonesCount = reminders.filter(r => r.active).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Location reminders */}
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <View style={styles.brandHeaderRow}>
          <AppBrand size={38} />
          <UserAvatar user={user} size={34} />
        </View>
        <View style={styles.titleRow}>
          <View style={styles.titleGroup}>
            <View style={styles.compassIconCircle}>
              <Ionicons name="navigate" size={18} color="#2563EB" />
            </View>
            <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>Location Reminders</Text>
          </View>

          <TouchableOpacity style={styles.addReminderButton} onPress={() => setIsModalOpen(true)}>
            <Ionicons name="add" size={17} color="#FFFFFF" />
            <Text style={styles.addReminderButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.screenSubtitle}>
          Your location reminders appear here.
        </Text>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Saved reminders</Text>
          <Text style={styles.autoSurfacingText}>{activeZonesCount} enabled</Text>
        </View>

        {reminders.length === 0 ? (
          <View style={[styles.emptyRemindersCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Ionicons name="location-outline" size={30} color="#64748B" />
            <Text style={[styles.emptyRemindersTitle, { color: theme.textPrimary }]}>No location reminders</Text>
            <Text style={[styles.emptyRemindersText, { color: theme.textSecondary }]}>Add a reminder to start your list.</Text>
          </View>
        ) : null}

        {reminders.map((item) => {
          const isFuel = item.category === 'Fuel' || item.title.toLowerCase().includes('petrol');
          return (
            <View key={item.id} style={[styles.reminderCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }, !item.active && styles.reminderCardPaused, darkMode && !item.active && { opacity: 0.7 }]}>
              
              <View style={styles.cardTopRow}>
                {/* Category Icon */}
                <View style={[styles.categoryIconBox, isFuel ? styles.fuelIconBox : styles.libraryIconBox]}>
                  <Ionicons 
                    name={isFuel ? "color-filter" : "book-outline"} 
                    size={22} 
                    color={isFuel ? "#2563EB" : "#0D9488"} 
                  />
                </View>

                {/* Main Content */}
                <View style={styles.reminderContent}>
                  <View style={styles.reminderTitleRow}>
                    <Text style={[styles.reminderTitle, { color: theme.textPrimary }, !item.active && styles.textMuted]}>
                      {item.title}
                    </Text>
                    <View style={styles.radiusPill}>
                      <Text style={styles.radiusPillText}>{item.radius || '500m radius'}</Text>
                    </View>
                  </View>

                  {/* Waypoint Place */}
                  <View style={styles.waypointRow}>
                    <Ionicons 
                      name={isFuel ? "location-outline" : "school-outline"} 
                      size={14} 
                      color={isFuel ? "#2563EB" : "#0D9488"} 
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.waypointText, { color: theme.textSecondary }]}>{item.placeName}</Text>
                  </View>

                  {/* Distance / Proximity status bullet */}
                  <View style={styles.distanceStatusRow}>
                    <View style={[styles.statusBullet, { backgroundColor: item.active ? '#10B981' : '#94A3B8' }]} />
                    <Text style={styles.distanceStatusText}>{item.active ? 'Enabled' : 'Paused'}</Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons: Edit & Pause */}
              <View style={styles.cardActionsRow}>
                <TouchableOpacity 
                  style={styles.editCardBtn} 
                  onPress={() => handleOpenEdit(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil" size={13} color="#0F172A" style={{ marginRight: 4 }} />
                  <Text style={styles.editCardBtnText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.pauseCardBtn, !item.active && styles.resumeCardBtn]} 
                  onPress={() => toggleReminderActive(item.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={item.active ? "pause-circle-outline" : "play-circle-outline"} 
                    size={14} 
                    color={item.active ? "#475569" : "#2563EB"} 
                    style={{ marginRight: 4 }} 
                  />
                  <Text style={[styles.pauseCardBtnText, !item.active && styles.resumeCardBtnText]}>
                    {item.active ? 'Pause' : 'Resume'}
                  </Text>
                </TouchableOpacity>
              </View>

            </View>
          );
        })}

      </ScrollView>

      {/* Add / Edit Location Reminder Modal */}
      <AddLocationReminderModal
        visible={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setReminderToEdit(null);
        }}
        onSaveReminder={handleSaveReminder}
        reminderToEdit={reminderToEdit}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  brandHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compassIconCircle: {
    marginRight: 6,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  addReminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 4,
  },
  addReminderButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  screenSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 17,
  },
  scrollList: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 110,
  },

  /* ================= MAP RADAR CARD ================= */
  mapRadarCard: {
    backgroundColor: '#E8F1FD',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  mapCanvas: {
    height: 155,
    position: 'relative',
    backgroundColor: '#E6F0FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapGridLineH: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  mapGridLineV: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  libraryZoneCircle: {
    position: 'absolute',
    left: 40,
    top: 40,
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#0D9488',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13, 148, 136, 0.08)',
  },
  zoneInnerCircleTeal: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCenterDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDotCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  fuelZoneCircle: {
    position: 'absolute',
    right: 40,
    top: 25,
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: '#2563EB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  zoneInnerCircleBlue: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshairButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  mapCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#DBEAFE',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerStatusText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  footerAccuracyText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },

  /* ================= SECTION HEADINGS ================= */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyRemindersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 28,
    marginTop: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyRemindersTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyRemindersText: {
    marginTop: 5,
    fontSize: 12,
    color: '#64748B',
  },
  autoSurfacingText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },

  /* ================= REMINDER CARDS ================= */
  reminderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  reminderCardPaused: {
    backgroundColor: '#F8FAFC',
    opacity: 0.7,
  },
  cardTopRow: {
    flexDirection: 'row',
  },
  categoryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fuelIconBox: {
    backgroundColor: '#EFF6FF',
  },
  libraryIconBox: {
    backgroundColor: '#F0FDFA',
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  reminderTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    marginRight: 6,
    lineHeight: 18,
  },
  textMuted: {
    color: '#64748B',
  },
  radiusPill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  radiusPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#2563EB',
  },
  waypointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  waypointText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  distanceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 5,
  },
  statusBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  distanceStatusText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  editCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  editCardBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  pauseCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pauseCardBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  resumeCardBtn: {
    backgroundColor: '#EFF6FF',
  },
  resumeCardBtnText: {
    color: '#2563EB',
  },

  /* ================= ACTION BUTTONS ================= */
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 12,
  },
  pickOnMapBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A', // Dark Navy matching mockup
    paddingVertical: 13,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  pickOnMapBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
  currentSpotBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  currentSpotBtnText: {
    color: '#0F172A',
    fontSize: 13.5,
    fontWeight: '800',
  },

  /* ================= PRIVACY CARD ================= */
  privacyCard: {
    backgroundColor: '#F0F7FF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginTop: 4,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  privacyTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  privacyDescription: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
});
