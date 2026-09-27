import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../components/Header';
import CognitiveAssistBanner from '../components/CognitiveAssistBanner';
import FilterPills from '../components/FilterPills';
import TaskCard from '../components/TaskCard';
import { colors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';

export default function HomeScreen({ 
  tasks, 
  onToggleComplete, 
  onNavigateToTab, 
  pendingDetectionsCount,
  detections = [],
  user,
  onTaskAction,
  onRefresh,
}) {
  const { theme } = useTheme();
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    Promise.resolve(onRefresh?.()).finally(() => setRefreshing(false));
  };

  // Filter tasks
  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = tasks.filter(t => !t.completed && (t.dueCategory === 'today' || t.date === today));
  const upcomingTasks = tasks.filter(t => !t.completed && (t.dueCategory === 'upcoming' || (t.date && t.date > today)));
  const completedTasks = tasks.filter(t => t.completed);

  const counts = {
    all: tasks.length,
    today: todayTasks.length,
    upcoming: upcomingTasks.length,
    pending: pendingDetectionsCount,
    completed: completedTasks.length,
  };

  const getFilteredTasks = () => {
    switch (activeFilter) {
      case 'today':
        return todayTasks;
      case 'upcoming':
        return upcomingTasks;
      case 'completed':
        return completedTasks;
      case 'pending':
        return []; // redirects to detections or shows none here
      case 'all':
      default:
        return tasks;
    }
  };

  const displayTasks = getFilteredTasks();
  const firstPendingDetection = detections.find((detection) => detection.status === 'pending');
  const detectionAge = firstPendingDetection?.createdAt
    ? Date.now() - new Date(firstPendingDetection.createdAt).getTime()
    : null;
  const detectionAgeLabel = detectionAge === null || Number.isNaN(detectionAge) ? ''
    : detectionAge < 60000 ? 'Just now'
      : detectionAge < 3600000 ? `${Math.floor(detectionAge / 60000)}m ago`
        : `${Math.floor(detectionAge / 3600000)}h ago`;

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} />}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Top Header */}
      <Header user={user} onProfilePress={() => onNavigateToTab('profile')} />

      {/* AI Cognitive Assist Banner */}
      <CognitiveAssistBanner 
        pendingCount={pendingDetectionsCount} 
        onReviewPress={() => onNavigateToTab('detections')} 
      />

      {/* Filter Pills */}
      <FilterPills 
        activeFilter={activeFilter} 
        onSelectFilter={(filter) => {
          if (filter === 'pending') {
            onNavigateToTab('detections');
          } else {
            setActiveFilter(filter);
          }
        }} 
        counts={counts} 
      />

      {/* When filtering by specific pill (not All) */}
      {activeFilter !== 'all' ? (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithDot}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                {activeFilter.toUpperCase()} TASKS
              </Text>
            </View>
            <Text style={[styles.sectionDueCount, { color: theme.textSecondary }]}>
              {displayTasks.length} {displayTasks.length === 1 ? 'Task' : 'Tasks'}
            </Text>
          </View>

          {displayTasks.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Ionicons name="checkmark-done-circle" size={40} color="#94A3B8" />
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No tasks found</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>All items in this section are cleared.</Text>
            </View>
          ) : (
            displayTasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onToggleComplete={onToggleComplete}
                onActionPress={onTaskAction}
              />
            ))
          )}
        </View>
      ) : (
        /* Default Dashboard view with Structured Sections */
        <>
          {/* Section 1: Today's Schedule */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWithDot}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Today's Schedule</Text>
                <View style={styles.redActiveDot} />
              </View>
              <Text style={[styles.sectionDueCount, { color: theme.textSecondary }]}>
                {todayTasks.length} Tasks Due
              </Text>
            </View>

            {todayTasks.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <Ionicons name="sparkles" size={32} color="#10B981" />
                <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No tasks due today</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>Tasks with today’s date will appear here.</Text>
              </View>
            ) : (
              todayTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onToggleComplete={onToggleComplete}
                  onActionPress={onTaskAction}
                />
              ))
            )}
          </View>

          {/* Section 2: Upcoming Tasks */}
          {upcomingTasks.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleWithDot}>
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Upcoming</Text>
                  <View style={[styles.redActiveDot, { backgroundColor: '#3B82F6' }]} />
                </View>
                <TouchableOpacity onPress={() => onNavigateToTab('tasks')}>
                  <Text style={[styles.seeAllText, { color: theme.primary }]}>View all</Text>
                </TouchableOpacity>
              </View>

              {upcomingTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onToggleComplete={onToggleComplete}
                  onActionPress={onTaskAction}
                />
              ))}
            </View>
          )}

          {/* Section 3: Pending Confirmations Mini-Preview */}
          {pendingDetectionsCount > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleWithDot}>
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Pending Confirmations</Text>
                  <View style={[styles.redActiveDot, { backgroundColor: '#F59E0B' }]} />
                </View>
                <TouchableOpacity onPress={() => onNavigateToTab('detections')}>
                  <Text style={styles.seeAllText}>Review ({pendingDetectionsCount})</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.pendingDetectionCard}
                activeOpacity={0.85}
                onPress={() => onNavigateToTab('detections')}
              >
                <View style={styles.pendingHeader}>
                  <View style={styles.pendingTag}>
                    <Ionicons name="flash" size={12} color="#D97706" />
                    <Text style={styles.pendingTagText}>AI Auto-Detected</Text>
                  </View>
                  <Text style={styles.pendingTime}>{detectionAgeLabel}</Text>
                </View>
                <Text style={styles.pendingTitle}>
                  {firstPendingDetection?.title}
                </Text>
                <Text style={styles.pendingSource}>
                  From {firstPendingDetection?.sourceChannel || firstPendingDetection?.source || 'connected source'}
                </Text>
                <View style={styles.pendingActionRow}>
                  <Text style={styles.pendingTapToReview}>Tap to review & add to tasks →</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Section 4: Completed Tasks */}
          {completedTasks.length > 0 && (
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleWithDot}>
                  <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Completed</Text>
                </View>
                <Text style={[styles.sectionDueCount, { color: theme.textSecondary }]}>
                  {completedTasks.length} Done
                </Text>
              </View>

              {completedTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onToggleComplete={onToggleComplete}
                  onActionPress={onTaskAction}
                />
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 100, // Extra padding for bottom navigation
  },
  sectionContainer: {
    marginTop: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitleWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  redActiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
    marginLeft: 6,
  },
  sectionDueCount: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  seeAllText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pendingDetectionCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 14,
    marginHorizontal: 18,
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  pendingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  pendingTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  pendingTime: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '500',
  },
  pendingTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#78350F',
    lineHeight: 19,
  },
  pendingSource: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 4,
  },
  pendingActionRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  pendingTapToReview: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#B45309',
  },
});
