import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Modal, 
  TouchableWithoutFeedback,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import UserAvatar from '../components/UserAvatar';
import AppBrand from '../components/AppBrand';

export default function DetectionsScreen({ 
  detections, 
  user,
  onApproveDetection, 
  onDismissDetection,
  focusDetectionId,
  onDetectionFocused,
}) {
  const { darkMode, theme } = useTheme();
  const [selectedDetection, setSelectedDetection] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [highlightedDetectionId, setHighlightedDetectionId] = useState(null);
  const [cardPositions, setCardPositions] = useState({});
  const listRef = useRef(null);
  const handledFocusIdRef = useRef(null);

  const pendingList = detections.filter(d => d.status === 'pending');

  useEffect(() => {
    if (!focusDetectionId || handledFocusIdRef.current === focusDetectionId || cardPositions[focusDetectionId] === undefined) return undefined;
    handledFocusIdRef.current = focusDetectionId;
    listRef.current?.scrollTo({ y: Math.max(0, cardPositions[focusDetectionId] - 12), animated: true });
    setHighlightedDetectionId(focusDetectionId);
    onDetectionFocused?.(null);
  }, [focusDetectionId, cardPositions, onDetectionFocused]);

  useEffect(() => {
    if (!highlightedDetectionId) return undefined;
    const timeout = globalThis.setTimeout(() => setHighlightedDetectionId(null), 2400);
    return () => globalThis.clearTimeout(timeout);
  }, [highlightedDetectionId]);

  const handleOpenConfirm = (item) => {
    setSelectedDetection(item);
    setIsConfirmModalOpen(true);
  };

  const handleYesAdd = () => {
    if (selectedDetection) {
      onApproveDetection(selectedDetection);
      setIsConfirmModalOpen(false);
      setSelectedDetection(null);
    }
  };

  const handleNoDiscard = () => {
    if (selectedDetection) {
      onDismissDetection(selectedDetection.id);
      setIsConfirmModalOpen(false);
      setSelectedDetection(null);
    }
  };

  const handleConfirmAll = () => {
    if (pendingList.length === 0) return;
    
    Alert.alert(
      'Confirm All Detections',
      `Do you want to add all ${pendingList.length} detected tasks to your schedule?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, Add All', 
          onPress: () => {
            pendingList.forEach(item => onApproveDetection(item));
            Alert.alert('Success', `All ${pendingList.length} tasks added to your InBox.`);
          } 
        }
      ]
    );
  };

  const renderSourcePill = (source) => {
    const s = (source || 'email').toLowerCase();
    if (s === 'whatsapp') {
      return (
        <View style={[styles.sourcePill, styles.whatsappPill]}>
          <Ionicons name="chatbubble-ellipses" size={13} color="#059669" style={{ marginRight: 4 }} />
          <Text style={styles.whatsappText}>WhatsApp</Text>
        </View>
      );
    } else if (s === 'gmail' || s === 'email') {
      return (
        <View style={[styles.sourcePill, styles.gmailPill]}>
          <Ionicons name="mail" size={13} color="#E02424" style={{ marginRight: 4 }} />
          <Text style={styles.gmailText}>Gmail</Text>
        </View>
      );
    } else if (s === 'zoom') {
      return (
        <View style={[styles.sourcePill, styles.zoomPill]}>
          <Ionicons name="videocam" size={13} color="#2563EB" style={{ marginRight: 4 }} />
          <Text style={styles.zoomText}>Zoom</Text>
        </View>
      );
    } else if (s === 'calendar' || s === 'google calendar') {
      return (
        <View style={[styles.sourcePill, styles.calendarPill]}>
          <Ionicons name="calendar" size={13} color="#D97706" style={{ marginRight: 4 }} />
          <Text style={styles.calendarText}>{s === 'google calendar' ? 'Google Calendar' : 'Calendar'}</Text>
        </View>
      );
    } else {
      return (
        <View style={[styles.sourcePill, styles.defaultPill]}>
          <Ionicons name="layers" size={13} color="#475569" style={{ marginRight: 4 }} />
          <Text style={styles.defaultText}>InBox Sync</Text>
        </View>
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Top Header Bar matching Screenshot */}
      <View style={[styles.topHeader, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <View style={styles.brandRow}>
          <AppBrand size={38} />
          <UserAvatar user={user} size={36} />
        </View>

        {/* Title Row with Badge and "Confirm All" Link */}
        <View style={styles.titleSection}>
          <View style={styles.titleWithBadge}>
            <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>Pending Detections</Text>
            {pendingList.length > 0 && (
              <View style={styles.countBadgeCircle}>
                <Text style={styles.countBadgeText}>{pendingList.length}</Text>
              </View>
            )}
          </View>

          {pendingList.length > 0 && (
            <TouchableOpacity onPress={handleConfirmAll} activeOpacity={0.7}>
              <Text style={styles.confirmAllLink}>Confirm All</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.screenSubtitle, { color: theme.textSecondary }]}>
          Review tasks detected from your messages.
        </Text>
      </View>

      {/* Detections List */}
      <ScrollView 
        ref={listRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollList}
      >
        {pendingList.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="checkmark-done-circle" size={44} color="#10B981" />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No pending detections</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              No pending tasks detected right now. InBox will alert you when new signals arrive.
            </Text>
          </View>
        ) : (
          pendingList.map((item) => {
            const ageMs = item.createdAt ? Date.now() - new Date(item.createdAt).getTime() : null;
            const timeAgo = ageMs === null || Number.isNaN(ageMs) ? ''
              : ageMs < 60000 ? 'Just now'
                : ageMs < 3600000 ? `${Math.floor(ageMs / 60000)}m ago`
                  : ageMs < 86400000 ? `${Math.floor(ageMs / 3600000)}h ago`
                    : `${Math.floor(ageMs / 86400000)}d ago`;
            
            return (
              <View
                key={item.id}
                onLayout={({ nativeEvent }) => {
                  const y = nativeEvent.layout.y;
                  setCardPositions((current) => current[item.id] === y ? current : { ...current, [item.id]: y });
                }}
                style={[
                  styles.card,
                  { backgroundColor: theme.cardBackground, borderColor: theme.border },
                  highlightedDetectionId === item.id && styles.focusedCard,
                ]}
              >
                
                {/* Source Pill and Time Ago */}
                <View style={styles.cardHeader}>
                  {renderSourcePill(item.source)}
                  <Text style={[styles.timeAgoText, { color: theme.textSecondary }]}>{timeAgo}</Text>
                </View>

                {/* Task Title */}
                <Text style={[styles.taskTitle, { color: theme.textPrimary }]}>{item.title}</Text>

                {/* Soft Grey Excerpt Box */}
                <View style={[styles.excerptBox, darkMode && { backgroundColor: theme.surfaceVariant }]}>
                  <Text style={[styles.excerptText, darkMode && { color: theme.textSecondary }]}>
                    {item.contextText || item.description || 'No message details were provided.'}
                  </Text>
                </View>

                {/* Action Buttons: Discard & Confirm */}
                <View style={styles.actionButtonsRow}>
                  
                  {/* Discard Button */}
                  <TouchableOpacity 
                    style={styles.discardButton}
                    activeOpacity={0.75}
                    onPress={() => onDismissDetection(item.id)}
                  >
                    <Ionicons name="close" size={16} color="#334155" style={{ marginRight: 4 }} />
                    <Text style={styles.discardButtonText}>Discard</Text>
                  </TouchableOpacity>

                  {/* Confirm Button */}
                  <TouchableOpacity 
                    style={styles.confirmButton}
                    activeOpacity={0.85}
                    onPress={() => handleOpenConfirm(item)}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                  </TouchableOpacity>

                </View>

              </View>
            );
          })
        )}
      </ScrollView>

      {/* ========================================================== */}
      {/* CONFIRMATION POPUP MODAL */}
      {/* ========================================================== */}
      <Modal
        visible={isConfirmModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsConfirmModalOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsConfirmModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.popupContainer, darkMode && { backgroundColor: theme.cardBackground }]}>
                
                <View style={styles.popupIconCircle}>
                  <Ionicons name="sparkles" size={26} color="#2563EB" />
                </View>

                <Text style={styles.popupHeading}>
                  Task detected. Do you want to add it?
                </Text>
                
                <Text style={styles.popupSubheading}>
                  This task was extracted from your {selectedDetection?.source?.toUpperCase()} messages.
                </Text>

                {selectedDetection && (
                  <View style={[styles.popupDetailBox, darkMode && { backgroundColor: theme.surfaceVariant }]}>
                    <View style={styles.popupSourceRow}>
                      {renderSourcePill(selectedDetection.source)}
                      <Text style={styles.popupTime}>{selectedDetection.dateTime || 'Today, 6:00 PM'}</Text>
                    </View>

                    <Text style={styles.popupTaskTitle}>{selectedDetection.title}</Text>
                    
                    <Text style={styles.popupDescription}>
                      "{selectedDetection.description || selectedDetection.contextText}"
                    </Text>
                  </View>
                )}

                <View style={styles.popupButtonsColumn}>
                  <TouchableOpacity 
                    style={styles.yesAddButton}
                    activeOpacity={0.85}
                    onPress={handleYesAdd}
                  >
                    <Ionicons name="checkmark-done" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.yesAddButtonText}>Yes, Add Task</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.noDiscardButton}
                    activeOpacity={0.85}
                    onPress={handleNoDiscard}
                  >
                    <Ionicons name="close" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={styles.noDiscardButtonText}>No, Discard</Text>
                  </TouchableOpacity>
                </View>

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
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
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  countBadgeCircle: {
    backgroundColor: '#2563EB',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  confirmAllLink: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  screenSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  scrollList: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 110,
  },

  /* ================= DETECTION CARD (MATCHING SCREENSHOT) ================= */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  focusedCard: {
    borderColor: '#2563EB',
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sourcePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  whatsappPill: {
    backgroundColor: '#DCFCE7', // Soft green matching screenshot
  },
  whatsappText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#059669',
  },
  gmailPill: {
    backgroundColor: '#FEE2E2', // Soft red/pink matching screenshot
  },
  gmailText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#DC2626',
  },
  zoomPill: {
    backgroundColor: '#DBEAFE',
  },
  zoomText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#2563EB',
  },
  calendarPill: {
    backgroundColor: '#FEF3C7',
  },
  calendarText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#D97706',
  },
  defaultPill: {
    backgroundColor: '#F1F5F9',
  },
  defaultText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  timeAgoText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  taskTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 22,
    marginBottom: 10,
  },
  excerptBox: {
    backgroundColor: '#F1F5F9', // Soft grey box from screenshot
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  excerptText: {
    fontSize: 12.5,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 17,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  discardButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 11,
    borderRadius: 12,
  },
  discardButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  confirmButton: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB', // Solid blue from screenshot
    paddingVertical: 11,
    borderRadius: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 260,
  },

  /* ================= MODAL STYLES ================= */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  popupContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  popupIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  popupHeading: {
    fontSize: 17.5,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 22,
  },
  popupSubheading: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 12,
  },
  popupDetailBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  popupSourceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  popupTime: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  popupTaskTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 3,
  },
  popupDescription: {
    fontSize: 11.5,
    color: '#475569',
    fontStyle: 'italic',
  },
  popupButtonsColumn: {
    width: '100%',
    gap: 8,
  },
  yesAddButton: {
    width: '100%',
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  yesAddButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  noDiscardButton: {
    width: '100%',
    backgroundColor: '#FEE2E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
  },
  noDiscardButtonText: {
    color: '#DC2626',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
