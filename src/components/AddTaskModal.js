import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Switch, 
  Platform,
  Alert 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { openLocationSettings, requestLocationReminderPermissions } from '../lib/locationReminders';
import { useTheme } from '../theme/ThemeContext';
import UserAvatar from './UserAvatar';
import AppBrand from './AppBrand';

const formatLocalDate = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;

const formatDisplayTime = (value) => {
  const hours = value.getHours();
  return `${String((hours % 12) || 12).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
};

const toPickerDate = (dateValue, timeValue) => {
  const value = new Date();
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue || '');
  if (dateMatch) {
    value.setDate(1);
    value.setFullYear(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]));
    value.setDate(Number(dateMatch[3]));
  }
  const timeMatch = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i.exec(timeValue || '');
  if (timeMatch) {
    let hours = Number(timeMatch[1]);
    if (timeMatch[3]) hours = (hours % 12) + (timeMatch[3].toUpperCase() === 'PM' ? 12 : 0);
    value.setHours(hours, Number(timeMatch[2]), 0, 0);
  }
  return value;
};

export default function AddTaskModal({ visible, onClose, onSaveTask, taskToEdit = null, userProfile }) {
  const { darkMode, theme } = useTheme();
  const [taskName, setTaskName] = useState('');
  const [scheduleStrategy, setScheduleStrategy] = useState('fixed'); // 'fixed' | 'flexible'
  const [date, setDate] = useState('');
  const [targetTime, setTargetTime] = useState('');
  const [iosPickerMode, setIosPickerMode] = useState(null);
  const [pickerDraft, setPickerDraft] = useState(new Date());
  const [category, setCategory] = useState('Personal');
  const [geofenceEnabled, setGeofenceEnabled] = useState(false);
  const [activeWaypoint, setActiveWaypoint] = useState('');
  const [triggerRadius, setTriggerRadius] = useState('1 km'); // '500m' | '1 km' | '2 km'
  const [locationQuery, setLocationQuery] = useState('');
  const [placeResults, setPlaceResults] = useState([]);
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  const [requestingGps, setRequestingGps] = useState(false);
  const [locationFeedback, setLocationFeedback] = useState('');
  const [saveFeedback, setSaveFeedback] = useState('');
  const [savingTask, setSavingTask] = useState(false);
  const [repeatOnReentry, setRepeatOnReentry] = useState(false);
  const [prayerQuietWindow, setPrayerQuietWindow] = useState(true);
  const [notes, setNotes] = useState('');
  const [source, setSource] = useState('manual');

  // Pre-fill when editing
  useEffect(() => {
    if (taskToEdit) {
      setTaskName(taskToEdit.title || '');
      setCategory(taskToEdit.category || taskToEdit.tag || 'Personal');
      setDate(taskToEdit.date || '');
      setTargetTime(taskToEdit.time || '');
      setNotes(taskToEdit.description || '');
      setSource(taskToEdit.source || 'manual');
      setScheduleStrategy(taskToEdit.deadlineType || 'fixed');
      setGeofenceEnabled(Boolean(taskToEdit.location_enabled || taskToEdit.latitude || taskToEdit.location));
      const savedPlace = taskToEdit.location_name || taskToEdit.location?.placeName || taskToEdit.geofence?.waypoint || '';
      setActiveWaypoint(savedPlace);
      setLocationQuery(savedPlace);
      setSelectedCoordinates(taskToEdit.latitude != null && taskToEdit.longitude != null
        ? { latitude: Number(taskToEdit.latitude), longitude: Number(taskToEdit.longitude) }
        : null);
      const savedRadius = Number(taskToEdit.radius || taskToEdit.location?.radiusMeters);
      setTriggerRadius(savedRadius === 500 ? '500m' : savedRadius === 2000 ? '2 km' : '1 km');
      setRepeatOnReentry(Boolean(taskToEdit.repeatOnReentry));
    } else {
      resetForm();
    }
  }, [taskToEdit, visible]);

  const resetForm = () => {
    setTaskName('');
    setCategory('Personal');
    setScheduleStrategy('fixed');
    setDate('');
    setTargetTime('');
    setGeofenceEnabled(false);
    setActiveWaypoint('');
    setLocationQuery('');
    setPlaceResults([]);
    setSelectedCoordinates(null);
    setSearchingPlaces(false);
    setRequestingGps(false);
    setLocationFeedback('');
    setSaveFeedback('');
    setSavingTask(false);
    setTriggerRadius('1 km');
    setRepeatOnReentry(false);
    setPrayerQuietWindow(true);
    setNotes('');
    setSource('manual');
  };

  const enableLocationReminder = async () => {
    setLocationFeedback('');
    if (Platform.OS === 'web') {
      if (!globalThis.navigator?.geolocation) {
        setLocationFeedback('This browser cannot access GPS. Open InBox on an Android or iPhone device and allow location access.');
        return;
      }
      setRequestingGps(true);
      globalThis.navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setSelectedCoordinates({ latitude: coords.latitude, longitude: coords.longitude });
          setActiveWaypoint('Current location');
          setLocationQuery('Current location');
          setGeofenceEnabled(true);
          setRequestingGps(false);
          setLocationFeedback('GPS location selected. Browser previews cannot monitor geofences in the background; use the mobile app for arrival alerts.');
        },
        (error) => {
          const message = error.code === 1
            ? 'Location permission was denied. Allow Location for this site in your browser settings, turn on device location/GPS, then tap Add Location again.'
            : error.code === 2
              ? 'Your location is unavailable. Turn on device location/GPS and check your browser permission, then try again.'
              : 'Could not get your GPS location in time. Check that device location is on and try again.';
          setRequestingGps(false);
          setLocationFeedback(message);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
      );
      return;
    }
    try {
      const permission = await requestLocationReminderPermissions({
        confirmBackgroundAccess: () => new Promise((resolve) => Alert.alert(
          'Allow background location',
          'InBox needs background location to let the phone detect entering or leaving the place you selected. It uses the operating system geofence and does not continuously poll GPS.',
          [
            { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Continue', onPress: () => resolve(true) },
          ],
          { cancelable: true, onDismiss: () => resolve(false) },
        )),
      });
      if (!permission.granted) {
        const reason = permission.reason;
        const message = reason === 'location'
          ? 'Location permission is required for location reminders.'
          : reason === 'background'
            ? 'Allow background location in device settings so reminders can trigger while InBox is closed.'
            : reason === 'background-cancelled'
              ? 'Background location was not enabled. You can turn on Add Location later to set it up.'
            : reason === 'notifications'
              ? 'Notification permission is required to show location reminders.'
              : reason;
        setLocationFeedback(message);
        Alert.alert('Permission required', message, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openLocationSettings },
        ]);
        return;
      }
      setGeofenceEnabled(true);
      setLocationFeedback('Location access enabled. Search for a place below.');
      if (permission.approximate) {
        Alert.alert('Approximate location', 'Location reminders are enabled. With approximate location, a 500 m alert may arrive later; 1 km or 2 km is more reliable.');
      }
    } catch (error) {
      setLocationFeedback(error?.message || 'Please check location and notification settings.');
      Alert.alert('Location setup failed', error?.message || 'Please check location and notification settings.');
    }
  };

  const searchPlaces = async () => {
    const query = locationQuery.trim();
    if (Platform.OS === 'web') {
      setLocationFeedback('Place search and background reminders are available in the InBox Android/iOS app.');
      return;
    }
    if (!query) {
      Alert.alert('Enter a place', 'Type a place name or address to search.');
      return;
    }
    setSearchingPlaces(true);
    setPlaceResults([]);
    try {
      const results = await Location.geocodeAsync(query);
      if (!results.length) {
        Alert.alert('No place found', 'Try a nearby street, business, or full address.');
      } else {
        setPlaceResults(results.slice(0, 5));
      }
    } catch (error) {
      Alert.alert('Place search failed', error?.message || 'Check your connection and try again.');
    } finally {
      setSearchingPlaces(false);
    }
  };

  const handleSave = async () => {
    if (savingTask) return;
    setSaveFeedback('');
    if (!taskName.trim()) {
      setSaveFeedback('Please enter a task name before saving.');
      return;
    }
    if (geofenceEnabled && (!activeWaypoint || !selectedCoordinates)) {
      setSaveFeedback('Choose a place before saving this location reminder.');
      return;
    }

    const dueTime = [date.trim(), targetTime.trim()].filter(Boolean).join(', ') || 'No deadline set';
    const parsedDate = date ? toPickerDate(date, '') : null;
    const isUpcoming = parsedDate && !Number.isNaN(parsedDate.getTime()) && formatLocalDate(parsedDate) > formatLocalDate(new Date());
    const savedTask = {
      id: taskToEdit ? taskToEdit.id : `task-manual-${Date.now()}`,
      title: taskName.trim(),
      category: category,
      tag: category,
      deadlineType: scheduleStrategy,
      date: date,
      time: targetTime,
      dueTime,
      dueCategory: isUpcoming ? 'upcoming' : date ? 'today' : 'unscheduled',
      description: notes.trim(),
      source: geofenceEnabled ? 'location' : (taskToEdit?.source === 'location' ? 'manual' : (taskToEdit?.source || source)),
      completed: taskToEdit ? taskToEdit.completed : false,
      priority: taskToEdit?.priority || 'medium',
      prayerQuietWindow: prayerQuietWindow,
      location_enabled: geofenceEnabled,
      location_name: geofenceEnabled ? activeWaypoint : null,
      latitude: geofenceEnabled ? selectedCoordinates.latitude : null,
      longitude: geofenceEnabled ? selectedCoordinates.longitude : null,
      radius: geofenceEnabled ? (triggerRadius === '500m' ? 500 : triggerRadius === '2 km' ? 2000 : 1000) : null,
      repeatOnReentry,
      resetTriggerState: Boolean(taskToEdit && geofenceEnabled && (
        taskToEdit.location_name !== activeWaypoint
        || Number(taskToEdit.latitude) !== selectedCoordinates?.latitude
        || Number(taskToEdit.longitude) !== selectedCoordinates?.longitude
        || Number(taskToEdit.radius) !== (triggerRadius === '500m' ? 500 : triggerRadius === '2 km' ? 2000 : 1000)
      )),
      triggered: taskToEdit?.triggered || false,
      inside: taskToEdit?.inside || false,
      geofence: geofenceEnabled ? { waypoint: activeWaypoint, radius: triggerRadius } : null,
      sender: 'Manual Entry (InBox)',
      createdAt: new Date().toISOString(),
    };

    setSavingTask(true);
    try {
      const saved = await onSaveTask(savedTask);
      if (saved === false) {
        setSaveFeedback('Could not save this task. Please try again.');
        return;
      }
      onClose();
    } catch (error) {
      setSaveFeedback(error?.message || 'Could not save this task. Please try again.');
    } finally {
      setSavingTask(false);
    }
  };

  const openDateTimePicker = (mode) => {
    const initialValue = toPickerDate(date, targetTime);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initialValue,
        mode,
        display: mode === 'date' ? 'calendar' : 'clock',
        onChange: (event, selectedValue) => {
          if (event.type !== 'set' || !selectedValue) return;
          if (mode === 'date') setDate(formatLocalDate(selectedValue));
          else setTargetTime(formatDisplayTime(selectedValue));
        },
      });
      return;
    }
    setPickerDraft(initialValue);
    setIosPickerMode(mode);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        
        {/* Top Header Bar matching Mockup */}
        <View style={[styles.topAppBar, darkMode && { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
          </TouchableOpacity>

          <View style={styles.topTitleGroup}>
            <AppBrand size={38} />
            <Text style={[styles.appBarTitle, { color: theme.textSecondary }]}>{taskToEdit ? 'Edit Task' : 'New Task'}</Text>
          </View>

          <UserAvatar user={userProfile} size={30} />
        </View>

        {/* Subheader: Cancel, Smart Assist Active, Save Task */}
        <View style={[styles.subHeaderBar, darkMode && { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <View style={styles.smartAssistPill}>
            <Ionicons name="navigate" size={12} color="#2563EB" />
            <Text style={styles.smartAssistText}>SMART ASSIST ACTIVE</Text>
          </View>

          <TouchableOpacity onPress={handleSave} activeOpacity={0.7} disabled={savingTask}>
            <Text style={styles.saveTaskTopText}>{savingTask ? 'Saving…' : 'Save Task'}</Text>
          </TouchableOpacity>
        </View>

        {/* Form Body */}
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollBody}
        >
          {/* SECTION 1: TASK NAME */}
          <View style={styles.formSection}>
            <Text style={[styles.fieldLabel, darkMode && { color: theme.textSecondary }]}>TASK NAME</Text>
            <View style={[styles.inputCard, darkMode && { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
              <TextInput
                style={[styles.textInputMain, { color: theme.textPrimary }]}
                placeholder="Enter a task title"
                placeholderTextColor={theme.textMuted}
                value={taskName}
                onChangeText={setTaskName}
              />
            </View>
          </View>

          {/* SECTION 2: SCHEDULE STRATEGY */}
          <View style={styles.formSection}>
            <Text style={[styles.fieldLabel, darkMode && { color: theme.textSecondary }]}>SCHEDULE STRATEGY</Text>
            <View style={[styles.strategyContainer, darkMode && { backgroundColor: theme.surfaceVariant }]}>
              <TouchableOpacity 
                style={[styles.strategyCard, scheduleStrategy === 'fixed' && styles.strategyCardActive]}
                onPress={() => setScheduleStrategy('fixed')}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name="calendar" 
                  size={16} 
                  color={scheduleStrategy === 'fixed' ? '#FFFFFF' : '#64748B'} 
                />
                <Text style={[styles.strategyText, scheduleStrategy === 'fixed' && styles.strategyTextActive]}>
                  Fixed Deadline
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.strategyCard, scheduleStrategy === 'flexible' && styles.strategyCardActive]}
                onPress={() => setScheduleStrategy('flexible')}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons 
                  name="sprout" 
                  size={16} 
                  color={scheduleStrategy === 'flexible' ? '#FFFFFF' : '#64748B'} 
                />
                <Text style={[styles.strategyText, scheduleStrategy === 'flexible' && styles.strategyTextActive]}>
                  Flexible / Someday
                </Text>
              </TouchableOpacity>
            </View>

            {/* Date & Target Time Pickers */}
            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeCol}>
                <Text style={[styles.subFieldLabel, darkMode && { color: theme.textSecondary }]}>Date</Text>
                <View style={[styles.pickerBox, darkMode && { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                  <Ionicons name="calendar-outline" size={15} color="#2563EB" style={styles.pickerIcon} />
                  {Platform.OS === 'web' ? (
                    React.createElement('input', {
                      type: 'date',
                      value: date,
                      onChange: (event) => setDate(event.currentTarget.value),
                      'aria-label': 'Choose date',
                      style: styles.webPickerInput,
                    })
                  ) : (
                    <TouchableOpacity style={styles.pickerTouchTarget} onPress={() => openDateTimePicker('date')} accessibilityRole="button" accessibilityLabel="Choose date">
                      <Text style={[styles.pickerInput, darkMode && { color: theme.textPrimary }, !date && styles.pickerPlaceholder]}>{date || 'Choose date'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.dateTimeCol}>
                <Text style={[styles.subFieldLabel, darkMode && { color: theme.textSecondary }]}>Target Time</Text>
                <View style={[styles.pickerBox, darkMode && { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                  <Ionicons name="time-outline" size={15} color="#2563EB" style={styles.pickerIcon} />
                  {Platform.OS === 'web' ? (
                    React.createElement('input', {
                      type: 'time',
                      value: targetTime ? (() => { const selected = toPickerDate('', targetTime); return `${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`; })() : '',
                      onChange: (event) => setTargetTime(event.currentTarget.value ? formatDisplayTime(toPickerDate('', event.currentTarget.value)) : ''),
                      'aria-label': 'Choose time',
                      style: styles.webPickerInput,
                    })
                  ) : (
                    <TouchableOpacity style={styles.pickerTouchTarget} onPress={() => openDateTimePicker('time')} accessibilityRole="button" accessibilityLabel="Choose time">
                      <Text style={[styles.pickerInput, darkMode && { color: theme.textPrimary }, !targetTime && styles.pickerPlaceholder]}>{targetTime || 'Choose time'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* SECTION 3: CLASSIFICATION & URGENCY (Category: Study / Work / Personal) */}
          <View style={styles.formSection}>
            <Text style={[styles.fieldLabel, darkMode && { color: theme.textSecondary }]}>CLASSIFICATION & URGENCY</Text>
            <View style={styles.categoryRow}>
              {[
                { id: 'Study', label: 'Study', icon: 'school' },
                { id: 'Work', label: 'Work', icon: 'briefcase' },
                { id: 'Personal', label: 'Personal', icon: 'person' },
              ].map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                    onPress={() => setCategory(cat.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons 
                      name={cat.icon} 
                      size={14} 
                      color={isSelected ? '#2563EB' : '#64748B'} 
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* SECTION 4: LOCATION REMINDER */}
          <View style={[styles.cardSection, darkMode && { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.iconCircleBlue}>
                  <Ionicons name="location" size={16} color="#2563EB" />
                </View>
                <View>
                  <Text style={[styles.cardTitle, darkMode && { color: theme.textPrimary }]}>Location Reminder</Text>
                  <Text style={[styles.cardSubtitle, darkMode && { color: theme.textSecondary }]}>Remind me when I arrive nearby</Text>
                </View>
              </View>
            </View>

            <View style={styles.locationChoiceRow}>
              <TouchableOpacity
                style={[styles.locationChoice, !geofenceEnabled && styles.locationChoiceActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: !geofenceEnabled }}
                onPress={() => {
                  setGeofenceEnabled(false);
                  setActiveWaypoint('');
                  setLocationQuery('');
                  setPlaceResults([]);
                  setSelectedCoordinates(null);
                  setLocationFeedback('Location reminder is off for this task.');
                }}
              >
                <Text style={[styles.locationChoiceText, !geofenceEnabled && styles.locationChoiceTextActive]}>No Location</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.locationChoice, geofenceEnabled && styles.locationChoiceActive]}
                onPress={enableLocationReminder}
                disabled={requestingGps}
                accessibilityRole="button"
                accessibilityState={{ selected: geofenceEnabled }}
              >
                <Ionicons name={requestingGps ? 'hourglass-outline' : 'location-outline'} size={14} color={geofenceEnabled ? '#FFFFFF' : '#64748B'} />
                <Text style={[styles.locationChoiceText, geofenceEnabled && styles.locationChoiceTextActive]}>{requestingGps ? 'Getting GPS…' : 'Add Location'}</Text>
              </TouchableOpacity>
            </View>

            {!!locationFeedback && <Text accessibilityLiveRegion="polite" style={styles.locationFeedback}>{locationFeedback}</Text>}

            {geofenceEnabled && (
              <View style={styles.geofenceDetails}>
                <Text style={styles.waypointLabel}>SEARCH FOR A PLACE</Text>
                <View style={styles.placeSearchRow}>
                  <TextInput
                    style={styles.placeSearchInput}
                    placeholder="Petrol station, address, or place"
                    placeholderTextColor="#94A3B8"
                    value={locationQuery}
                    onChangeText={(value) => { setLocationQuery(value); setPlaceResults([]); setSelectedCoordinates(null); }}
                    returnKeyType="search"
                    onSubmitEditing={searchPlaces}
                  />
                  <TouchableOpacity style={styles.placeSearchButton} onPress={searchPlaces} disabled={searchingPlaces}>
                    <Text style={styles.placeSearchButtonText}>{searchingPlaces ? 'Searching' : 'Search'}</Text>
                  </TouchableOpacity>
                </View>

                {!!activeWaypoint && !!selectedCoordinates && (
                  <View style={styles.waypointRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.waypointLabel}>SELECTED PLACE</Text>
                      <View style={styles.waypointValueRow}>
                        <Ionicons name="location" size={13} color="#047857" />
                        <Text style={styles.waypointValueText} numberOfLines={2}>{activeWaypoint}</Text>
                      </View>
                      <Text style={styles.coordinatesText}>{selectedCoordinates.latitude.toFixed(5)}, {selectedCoordinates.longitude.toFixed(5)}</Text>
                    </View>
                  </View>
                )}

                {placeResults.map((result, index) => (
                  <TouchableOpacity
                    key={`${result.latitude}-${result.longitude}-${index}`}
                    style={styles.placeResult}
                    onPress={() => {
                      setSelectedCoordinates({ latitude: result.latitude, longitude: result.longitude });
                      setActiveWaypoint(locationQuery.trim());
                      setPlaceResults([]);
                    }}
                  >
                    <Ionicons name="location-outline" size={16} color="#2563EB" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.placeResultTitle}>Search result {index + 1}</Text>
                      <Text style={styles.placeResultCoords}>{result.latitude.toFixed(5)}, {result.longitude.toFixed(5)}</Text>
                    </View>
                    <Text style={styles.changeLink}>Select</Text>
                  </TouchableOpacity>
                ))}

                <Text style={styles.locationPermissionNote}>Location permission is required for location reminders. Background access lets alerts work while InBox is closed.</Text>

                {/* Trigger Radius: 500m | 1 km | 2 km */}
                <View style={styles.radiusContainer}>
                  <View style={styles.radiusHeader}>
                    <Text style={styles.radiusTitle}>TRIGGER RADIUS</Text>
                    <Text style={styles.radiusSelected}>{triggerRadius}</Text>
                  </View>
                  <View style={styles.radiusPillsRow}>
                    {['500m', '1 km', '2 km'].map((rad) => (
                      <TouchableOpacity
                        key={rad}
                        style={[styles.radiusPill, triggerRadius === rad && styles.radiusPillActive]}
                        onPress={() => setTriggerRadius(rad)}
                      >
                        <Text style={[styles.radiusPillText, triggerRadius === rad && styles.radiusPillTextActive]}>
                          {rad}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.repeatRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[styles.cardTitle, darkMode && { color: theme.textPrimary }]}>Repeat on re-entry</Text>
                    <Text style={[styles.cardSubtitle, darkMode && { color: theme.textSecondary }]}>Remind again after leaving and returning</Text>
                  </View>
                  <Switch
                    value={repeatOnReentry}
                    onValueChange={setRepeatOnReentry}
                    trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                    thumbColor={repeatOnReentry ? '#2563EB' : '#F1F5F9'}
                  />
                </View>
              </View>
            )}
          </View>

          {/* SECTION 5: PRAYER-TIME QUIET WINDOW */}
          <View style={[styles.cardSection, darkMode && { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.iconCirclePurple}>
                  <Ionicons name="notifications-off" size={16} color="#4F46E5" />
                </View>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.cardTitle, darkMode && { color: theme.textPrimary }]}>Prayer-Time Quiet Window</Text>
                  <Text style={[styles.cardSubtitle, darkMode && { color: theme.textSecondary }]}>Delay notification if during prayer times (e.g., Friday Jumma)</Text>
                </View>
              </View>
              <Switch 
                value={prayerQuietWindow}
                onValueChange={setPrayerQuietWindow}
                trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                thumbColor={prayerQuietWindow ? '#2563EB' : '#F1F5F9'}
              />
            </View>

            {prayerQuietWindow && (
              <View style={styles.prayerNoticeBox}>
                <Ionicons name="information-circle-outline" size={14} color="#2563EB" style={{ marginRight: 6 }} />
                <Text style={styles.prayerNoticeText}>
                  Notification will be postponed until prayer concludes
                </Text>
              </View>
            )}
          </View>

          {/* SECTION 6: NOTES & CONTEXT */}
          <View style={styles.formSection}>
            <Text style={[styles.fieldLabel, darkMode && { color: theme.textSecondary }]}>NOTES & CONTEXT</Text>
            <View style={[styles.inputCard, darkMode && { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
              <TextInput
                style={[styles.textInputMain, styles.textAreaMain, { color: theme.textPrimary }]}
                placeholder="Add contextual notes or assignment instructions..."
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />
            </View>
          </View>

          {/* Primary Action Button: Save to Schedule */}
          <TouchableOpacity 
            style={styles.saveMainButton}
            onPress={handleSave}
            disabled={savingTask}
            activeOpacity={0.88}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.saveMainButtonText}>
              {savingTask ? 'Saving…' : taskToEdit ? 'Save Changes' : 'Save to Schedule'}
            </Text>
          </TouchableOpacity>
          {!!saveFeedback && <Text accessibilityLiveRegion="polite" style={styles.saveFeedback}>{saveFeedback}</Text>}

          {/* Clear Form */}
          <TouchableOpacity 
            style={styles.clearFormButton}
            onPress={resetForm}
            activeOpacity={0.7}
          >
            <Text style={styles.clearFormText}>Clear Form</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
      {Platform.OS === 'ios' && iosPickerMode && (
        <Modal transparent animationType="slide" visible onRequestClose={() => setIosPickerMode(null)}>
          <View style={styles.pickerModalBackdrop}>
            <View style={styles.pickerModalCard}>
              <View style={styles.pickerModalActions}>
                <TouchableOpacity onPress={() => setIosPickerMode(null)}><Text style={styles.pickerModalCancel}>Cancel</Text></TouchableOpacity>
                <Text style={styles.pickerModalTitle}>{iosPickerMode === 'date' ? 'Choose date' : 'Choose time'}</Text>
                <TouchableOpacity onPress={() => {
                  if (iosPickerMode === 'date') setDate(formatLocalDate(pickerDraft));
                  else setTargetTime(formatDisplayTime(pickerDraft));
                  setIosPickerMode(null);
                }}><Text style={styles.pickerModalDone}>Done</Text></TouchableOpacity>
              </View>
              <DateTimePicker value={pickerDraft} mode={iosPickerMode} display={iosPickerMode === 'date' ? 'inline' : 'spinner'} onChange={(_, value) => value && setPickerDraft(value)} />
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topAppBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 16 : 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    padding: 6,
  },
  topTitleGroup: {
    alignItems: 'center',
    gap: 3,
  },
  appBarTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  subHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  cancelText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#475569',
  },
  smartAssistPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 5,
  },
  smartAssistText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.6,
  },
  saveTaskTopText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#2563EB',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
  },
  formSection: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.7,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  inputCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textInputMain: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#0F172A',
  },
  textAreaMain: {
    minHeight: 65,
    textAlignVertical: 'top',
  },
  strategyContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 10,
  },
  strategyCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  strategyCardActive: {
    backgroundColor: '#0F172A', // Dark pill matching mockup
  },
  strategyText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  strategyTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeCol: {
    flex: 1,
  },
  subFieldLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  pickerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  pickerIcon: {
    marginRight: 6,
  },
  pickerInput: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  webPickerInput: {
    flex: 1,
    minWidth: 0,
    border: 0,
    outline: 'none',
    backgroundColor: 'transparent',
    color: '#0F172A',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'inherit',
  },
  pickerTouchTarget: {
    flex: 1,
    minHeight: 20,
    justifyContent: 'center',
  },
  pickerPlaceholder: {
    color: '#94A3B8',
  },
  pickerModalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  pickerModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
  },
  pickerModalActions: {
    minHeight: 52,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  pickerModalTitle: { color: '#0F172A', fontSize: 14, fontWeight: '700' },
  pickerModalCancel: { color: '#64748B', fontSize: 14, fontWeight: '600' },
  pickerModalDone: { color: '#2563EB', fontSize: 14, fontWeight: '700' },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryPillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  categoryPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryPillTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircleBlue: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconCirclePurple: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  geofenceDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  locationChoiceRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  locationChoice: {
    minHeight: 40,
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  locationChoiceActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  locationChoiceText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  locationChoiceTextActive: {
    color: '#FFFFFF',
  },
  locationFeedback: {
    color: '#475569',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
  placeSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 10,
  },
  placeSearchInput: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    fontSize: 12,
  },
  placeSearchButton: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    minHeight: 42,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  placeSearchButtonText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  placeResult: {
    minHeight: 48,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placeResultTitle: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  placeResultCoords: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  coordinatesText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 3,
  },
  locationPermissionNote: {
    fontSize: 10,
    lineHeight: 15,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 10,
  },
  repeatRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
  },
  waypointRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  waypointLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  waypointValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  waypointValueText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  changeLink: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563EB',
  },
  radiusContainer: {
    marginTop: 4,
  },
  radiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  radiusTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  radiusSelected: {
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
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusPillActive: {
    backgroundColor: '#2563EB',
  },
  radiusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  radiusPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  prayerNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 8,
    marginTop: 10,
  },
  prayerNoticeText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '500',
    flex: 1,
  },
  saveMainButton: {
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 10,
  },
  saveMainButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  saveFeedback: {
    color: '#B91C1C',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 8,
  },
  clearFormButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  clearFormText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});
