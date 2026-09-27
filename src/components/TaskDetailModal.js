import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SourceBadge from './SourceBadge';
import { colors } from '../theme/colors';
import { confirmAction } from '../lib/confirmAction';
import { useTheme } from '../theme/ThemeContext';
import AppBrand from './AppBrand';

export default function TaskDetailModal({ 
  visible, 
  task, 
  onClose, 
  onToggleComplete, 
  onEditTask, 
  onDeleteTask 
}) {
  const { theme } = useTheme();
  if (!task) return null;

  const isCompleted = task.completed;

  const handleDelete = () => {
    confirmAction({
      title: 'Delete Task',
      message: `Are you sure you want to delete "${task.title}"?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => {
        onDeleteTask(task.id);
        onClose();
      },
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.brandHeader}><AppBrand size={38} /></View>
          
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.badgeGroup}>
              <SourceBadge source={task.source} />
              <View style={[styles.statusBadge, isCompleted ? styles.statusDone : styles.statusPending]}>
                <Ionicons 
                  name={isCompleted ? "checkmark-circle" : "time"} 
                  size={12} 
                  color={isCompleted ? "#059669" : "#D97706"} 
                />
                <Text style={[styles.statusBadgeText, isCompleted ? styles.statusDoneText : styles.statusPendingText]}>
                  {isCompleted ? 'Completed' : 'Pending'}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            
            {/* Title */}
            <Text style={[styles.taskTitle, { color: theme.textPrimary }, isCompleted && styles.taskTitleCompleted]}>
              {task.title}
            </Text>

            {/* Meta Grid */}
            <View style={styles.metaGrid}>
              
              {/* Date & Time */}
              <View style={[styles.metaBox, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                <Ionicons name="time-outline" size={16} color="#2563EB" />
                <View style={styles.metaTextCol}>
                  <Text style={styles.metaLabel}>DEADLINE</Text>
                  <Text style={[styles.metaVal, { color: theme.textPrimary }]}>{task.dueTime || [task.date, task.time].filter(Boolean).join(', ') || 'No deadline set'}</Text>
                </View>
              </View>

              {/* Category */}
              <View style={[styles.metaBox, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                <Ionicons name="pricetag-outline" size={16} color="#7C3AED" />
                <View style={styles.metaTextCol}>
                  <Text style={styles.metaLabel}>CATEGORY</Text>
                  <Text style={[styles.metaVal, { color: theme.textPrimary }]}>{task.category || task.tag || 'Study'}</Text>
                </View>
              </View>

            </View>

            {/* Deadline Type & Reminder Info */}
            <View style={[styles.infoRowCard, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
              <View style={styles.infoItem}>
                <Text style={styles.infoKey}>Deadline Type:</Text>
                <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{task.deadlineType === 'flexible' ? 'Flexible / Someday' : 'Fixed Deadline'}</Text>
              </View>

              <View style={styles.infoItem}>
                <Text style={styles.infoKey}>Prayer Quiet Window:</Text>
                <Text style={[styles.infoVal, { color: theme.textPrimary }]}>{task.prayerQuietWindow !== false ? 'Active (Delay during Jumma)' : 'Disabled'}</Text>
              </View>
            </View>

            {/* Geofence info if present */}
            {(task.location_enabled || task.geofence || task.source === 'location') && (
              <View style={styles.locationCard}>
                <View style={styles.locationHeader}>
                  <Ionicons name="location" size={16} color="#DC2626" />
                  <Text style={styles.locationTitle}>Location Reminder</Text>
                </View>
                <Text style={styles.locationText}>
                  {task.location_name || task.geofence?.waypoint || task.location?.placeName || task.tag || 'No location set'}
                </Text>
                <Text style={styles.locationRadius}>
                  Radius: {task.radius ? `${task.radius === 500 ? '500 m' : task.radius === 2000 ? '2 km' : '1 km'}` : task.geofence?.radius || task.location?.radius || 'Not set'}
                </Text>
              </View>
            )}

            {/* Notes / Description */}
            <View style={styles.notesSection}>
              <Text style={styles.notesHeader}>NOTES & CONTEXT</Text>
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>
                  {task.description || 'No additional notes provided for this task.'}
                </Text>
              </View>
            </View>

          </ScrollView>

          {/* Action Buttons Row: Edit, Complete/Undo, Delete */}
          <View style={styles.actionsFooter}>
            
            {/* Toggle Complete */}
            <TouchableOpacity 
              style={[styles.actionBtn, isCompleted ? styles.undoBtn : styles.completeBtn]}
              onPress={() => {
                onToggleComplete(task.id);
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={isCompleted ? "arrow-undo-outline" : "checkmark-done-circle-outline"} 
                size={18} 
                color="#FFFFFF" 
                style={{ marginRight: 6 }} 
              />
              <Text style={styles.actionBtnText}>
                {isCompleted ? 'Mark Pending' : 'Complete'}
              </Text>
            </TouchableOpacity>

            {/* Edit */}
            <TouchableOpacity 
              style={[styles.actionBtn, styles.editBtn]}
              onPress={() => {
                onClose();
                onEditTask(task);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="pencil" size={16} color="#2563EB" style={{ marginRight: 6 }} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>

            {/* Delete */}
            <TouchableOpacity 
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={handleDelete}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>

          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  brandHeader: { marginBottom: 12 },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusDone: {
    backgroundColor: '#D1FAE5',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusPendingText: {
    color: '#92400E',
  },
  statusDoneText: {
    color: '#065F46',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
  },
  scrollBody: {
    paddingVertical: 14,
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 26,
    marginBottom: 14,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  metaBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 10,
  },
  metaTextCol: {
    marginLeft: 8,
    flex: 1,
  },
  metaLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  metaVal: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  infoRowCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoKey: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  infoVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  locationCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  locationTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
  },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7F1D1D',
  },
  locationRadius: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
  },
  notesSection: {
    marginTop: 4,
  },
  notesHeader: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  notesBox: {
    backgroundColor: '#F8FAFC',
    borderLeftWidth: 3.5,
    borderLeftColor: '#2563EB',
    borderRadius: 10,
    padding: 12,
  },
  notesText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  actionsFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  completeBtn: {
    flex: 2,
    backgroundColor: '#10B981',
  },
  undoBtn: {
    flex: 2,
    backgroundColor: '#64748B',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  editBtn: {
    flex: 1.5,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  editBtnText: {
    color: '#2563EB',
    fontSize: 13.5,
    fontWeight: '700',
  },
  deleteBtn: {
    width: 48,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
});
