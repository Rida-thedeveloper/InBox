import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Platform,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import AppBrand from './AppBrand';

export default function AddLocationReminderModal({ 
  visible, 
  onClose, 
  onSaveReminder, 
  reminderToEdit = null 
}) {
  const { darkMode, theme } = useTheme();
  const [taskTitle, setTaskTitle] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [radius, setRadius] = useState('500 m'); // '500 m' | '1 km' | '2 km'
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('General');

  useEffect(() => {
    if (reminderToEdit) {
      setTaskTitle(reminderToEdit.title || '');
      setPlaceName(reminderToEdit.placeName || '');
      setRadius(reminderToEdit.radius || '500 m');
      setNotes(reminderToEdit.description || '');
      setCategory(reminderToEdit.category || 'General');
    } else {
      resetForm();
    }
  }, [reminderToEdit, visible]);

  const resetForm = () => {
    setTaskTitle('');
    setPlaceName('');
    setRadius('500 m');
    setNotes('');
    setCategory('General');
  };

  const handleSave = async () => {
    if (!taskTitle.trim() || !placeName.trim()) {
      Alert.alert('Required', 'Please enter both a task title and location.');
      return;
    }

    const savedReminder = {
      id: reminderToEdit ? reminderToEdit.id : `place-${Date.now()}`,
      title: taskTitle.trim(),
      placeName: placeName.trim(),
      radius: radius,
      category: category,
      active: true,
      description: notes.trim(),
    };

    try {
      await onSaveReminder(savedReminder);
      onClose();
    } catch (error) {
      Alert.alert('Could not save location reminder', error?.message || 'Please try again.');
    }
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
            <View style={styles.headerTitleGroup}>
              <View style={styles.iconCircle}>
                <Ionicons name="location" size={18} color="#2563EB" />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  {reminderToEdit ? 'Edit Location Reminder' : 'New Location Reminder'}
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>Reminder details</Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formBody}>
            
            {/* Explanatory Message Box */}
            <View style={styles.noticeBanner}>
              <Ionicons name="notifications-circle" size={20} color="#2563EB" style={{ marginRight: 8 }} />
              <Text style={styles.noticeBannerText}>
                Location reminders can be saved here. Background location alerts are not enabled yet.
              </Text>
            </View>

            {/* TASK TITLE */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>TASK / REMINDER *</Text>
              <TextInput
                style={[styles.textInput, darkMode && { backgroundColor: theme.surfaceVariant, color: theme.textPrimary, borderColor: theme.border }]}
                placeholder="Describe the reminder"
                placeholderTextColor={theme.textMuted}
                value={taskTitle}
                onChangeText={setTaskTitle}
              />
            </View>

            {/* LOCATION / WAYPOINT */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>LOCATION / WAYPOINT *</Text>
              <View style={[styles.locationInputBox, darkMode && { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                <Ionicons name="business" size={16} color="#64748B" style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.locationTextInput, darkMode && { color: theme.textPrimary }]}
                placeholder="Enter a place name"
                  placeholderTextColor={theme.textMuted}
                  value={placeName}
                  onChangeText={setPlaceName}
                />
              </View>
            </View>

            {/* TRIGGER RADIUS (500m | 1 km | 2 km) */}
            <View style={styles.inputGroup}>
              <View style={styles.radiusLabelRow}>
                <Text style={styles.inputLabel}>GEOFENCE TRIGGER RADIUS</Text>
                <Text style={styles.activeRadiusText}>{radius}</Text>
              </View>

              <View style={styles.radiusPillsRow}>
                {['500 m', '1 km', '2 km'].map((rad) => {
                  const isSelected = radius === rad;
                  return (
                    <TouchableOpacity
                      key={rad}
                      style={[styles.radiusPill, isSelected && styles.radiusPillActive]}
                      onPress={() => setRadius(rad)}
                      activeOpacity={0.8}
                    >
                      <Ionicons 
                        name="radio-button-on" 
                        size={12} 
                        color={isSelected ? '#FFFFFF' : '#94A3B8'} 
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.radiusPillText, isSelected && styles.radiusPillTextActive]}>
                        {rad}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* CATEGORY SELECTOR */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PRESET CATEGORY</Text>
              <View style={styles.categoryRow}>
                {[
                  { id: 'Fuel', label: 'Fuel / Auto', icon: 'car-sport' },
                  { id: 'Education', label: 'Library / Study', icon: 'school' },
                  { id: 'Shopping', label: 'Errands', icon: 'basket' },
                ].map((c) => {
                  const isSelected = category === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                      onPress={() => setCategory(c.id)}
                    >
                      <Ionicons 
                        name={c.icon} 
                        size={13} 
                        color={isSelected ? '#2563EB' : '#64748B'} 
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* NOTES */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NOTES & CONTEXT</Text>
              <TextInput
                style={[styles.textInput, styles.textArea, darkMode && { backgroundColor: theme.surfaceVariant, color: theme.textPrimary, borderColor: theme.border }]}
                placeholder="Add details (e.g. check tire pressure, return psychology book)..."
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={2}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.footerRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Ionicons name="navigate-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.saveButtonText}>
                  {reminderToEdit ? 'Save Changes' : 'Create Location Reminder'}
                </Text>
              </TouchableOpacity>
            </View>

          </ScrollView>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '90%',
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
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
  },
  formBody: {
    paddingVertical: 14,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  noticeBannerText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '600',
    flex: 1,
    lineHeight: 17,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0F172A',
    fontWeight: '600',
  },
  locationInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  locationTextInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    fontWeight: '600',
    paddingVertical: 8,
  },
  textArea: {
    minHeight: 55,
    textAlignVertical: 'top',
  },
  radiusLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  activeRadiusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  radiusPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  radiusPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  radiusPillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  radiusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  radiusPillTextActive: {
    color: '#FFFFFF',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryPillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  categoryText: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#64748B',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
