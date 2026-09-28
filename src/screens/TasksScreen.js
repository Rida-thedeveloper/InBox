import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SourceBadge from '../components/SourceBadge';
import TaskDetailModal from '../components/TaskDetailModal';
import { colors } from '../theme/colors';
import { confirmAction } from '../lib/confirmAction';
import { useTheme } from '../theme/ThemeContext';
import AppBrand from '../components/AppBrand';
import UserAvatar from '../components/UserAvatar';
import { getWhatsAppContactName } from '../lib/whatsappSender';

export default function TasksScreen({ 
  tasks, 
  onToggleComplete, 
  onEditTask, 
  onDeleteTask, 
  onAddTaskPress,
  user,
}) {
  const { darkMode, theme } = useTheme();
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'today' | 'upcoming' | 'completed'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' | 'Study' | 'Work' | 'Personal'
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState(null);
  const today = new Date().toISOString().slice(0, 10);
  const isToday = (task) => task.dueCategory === 'today' || task.date === today || (task.dueTime && task.dueTime.toLowerCase().includes('today'));
  const isUpcoming = (task) => task.dueCategory === 'upcoming' || (task.date && task.date > today) || (task.dueTime && task.dueTime.toLowerCase().includes('tomorrow'));
  const getWhatsAppSenderLabel = (sender) => {
    const contactName = getWhatsAppContactName(sender);
    return contactName ? `WhatsApp · ${contactName}` : 'WhatsApp';
  };

  const tabs = [
    { id: 'all', label: 'All', count: tasks.length },
    { id: 'today', label: 'Today', count: tasks.filter(t => !t.completed && isToday(t)).length },
    { id: 'upcoming', label: 'Upcoming', count: tasks.filter(t => !t.completed && isUpcoming(t)).length },
    { id: 'completed', label: 'Completed', count: tasks.filter(t => t.completed).length },
  ];

  // Filtering logic
  const filteredTasks = tasks.filter(task => {
    // Tab filter
    if (activeTab === 'today') {
      if (task.completed) return false;
      if (!isToday(task)) return false;
    } else if (activeTab === 'upcoming') {
      if (task.completed) return false;
      if (!isUpcoming(task)) return false;
    } else if (activeTab === 'completed') {
      if (!task.completed) return false;
    }

    // Category filter
    if (selectedCategory !== 'all') {
      const cat = task.category || task.tag || '';
      if (cat.toLowerCase() !== selectedCategory.toLowerCase()) return false;
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = String(task.title || '').toLowerCase().includes(q);
      const matchCat = (task.category || task.tag || '').toLowerCase().includes(q);
      const matchDesc = (task.description || '').toLowerCase().includes(q);
      const matchSource = (task.source || '').toLowerCase().includes(q);
      if (!matchTitle && !matchCat && !matchDesc && !matchSource) return false;
    }

    return true;
  });
  const newestFirstTasks = filteredTasks
    .map((task, index) => ({ task, index, createdAt: Date.parse(task.createdAt || task.created_at || '') }))
    .sort((a, b) => {
      const aTime = Number.isNaN(a.createdAt) ? 0 : a.createdAt;
      const bTime = Number.isNaN(b.createdAt) ? 0 : b.createdAt;
      return bTime - aTime || a.index - b.index;
    })
    .map(({ task }) => task);

  const handleDeletePrompt = (task) => {
    confirmAction({
      title: 'Delete Task',
      message: `Are you sure you want to delete "${task.title}"?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => onDeleteTask(task.id),
    });
  };

  const getCategoryColor = (cat) => {
    const c = (cat || '').toLowerCase();
    if (c === 'study') return { bg: '#EFF6FF', text: '#1D4ED8', border: '#DBEAFE' };
    if (c === 'work') return { bg: '#F5F3FF', text: '#6D28D9', border: '#EDE9FE' };
    if (c === 'personal') return { bg: '#ECFDF5', text: '#047857', border: '#D1FAE5' };
    return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <View style={styles.brandHeaderRow}>
          <AppBrand size={38} />
          <UserAvatar user={user} size={34} />
        </View>
        <View style={styles.titleRow}>
          <View>
            <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>Tasks</Text>
            <Text style={[styles.screenSubtitle, { color: theme.textSecondary }]}>
              Tasks saved in this account
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.addTopBtn} 
            onPress={onAddTaskPress}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addTopBtnText}>+ Add Task</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
          <Ionicons name="search" size={16} color={theme.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title, category, or source..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* 4 Main Tabs: All, Today, Upcoming, Completed */}
        <View style={[styles.tabsRow, { backgroundColor: theme.surfaceVariant }]}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabButton, isActive && styles.tabButtonActive, isActive && darkMode && { backgroundColor: '#2563EB' }]}
                onPress={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'all') {
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Category Pills: All | Study | Work | Personal */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryFilterScroll}
        >
          {['all', 'Study', 'Work', 'Personal'].map((cat) => {
            const isCatActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.catPill, { backgroundColor: theme.cardBackground, borderColor: theme.border }, isCatActive && styles.catPillActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.catPillText, { color: theme.textSecondary }, isCatActive && styles.catPillTextActive]}>
                  {cat === 'all' ? 'All Categories' : cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Task List */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        <View style={styles.resultsBar}>
          <Text style={[styles.resultsCountText, { color: theme.textMuted }]}>
            {filteredTasks.length} {filteredTasks.length === 1 ? 'Task' : 'Tasks'} in {activeTab.toUpperCase()}
          </Text>
        </View>

        {filteredTasks.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="clipboard-outline" size={40} color="#94A3B8" />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No tasks found</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              {activeTab === 'completed' 
                ? 'No completed tasks yet. Tap the circle on any task to complete it.' 
                : 'Create a new task with the + Add Task button.'}
            </Text>
            <TouchableOpacity style={styles.emptyCreateBtn} onPress={onAddTaskPress}>
              <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.emptyCreateBtnText}>Create Task</Text>
            </TouchableOpacity>
          </View>
        ) : (
          newestFirstTasks.map((task) => {
            const isDone = task.completed;
            const catConfig = getCategoryColor(task.category || task.tag);

            return (
              <View
                key={task.id}
                style={[styles.taskCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }, isDone && (darkMode ? { backgroundColor: theme.surfaceVariant } : styles.taskCardDone)]}
              >
                {/* Checkbox */}
                <TouchableOpacity 
                  style={styles.checkboxTouch}
                  onPress={() => onToggleComplete(task.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkCircle, isDone && styles.checkCircleDone]}>
                    {isDone && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>

                {/* Main Content */}
                <TouchableOpacity
                  style={styles.cardContent}
                  activeOpacity={0.85}
                  onPress={() => setSelectedTaskForDetail(task)}
                >
                  
                  {/* Badges Row: Source + Category + Status */}
                  <View style={styles.badgesRow}>
                    <SourceBadge source={task.source} size="small" />
                    
                    <View style={[styles.categoryTag, { backgroundColor: catConfig.bg, borderColor: catConfig.border }]}>
                      <Text style={[styles.categoryTagText, { color: catConfig.text }]}>
                        {task.category || task.tag || 'Uncategorized'}
                      </Text>
                    </View>

                    <View style={[styles.statusTag, isDone ? styles.statusDoneTag : styles.statusPendingTag]}>
                      <Text style={[styles.statusTagText, isDone ? styles.statusDoneTagText : styles.statusPendingTagText]}>
                        {isDone ? 'Completed' : 'Pending'}
                      </Text>
                    </View>
                  </View>

                  {/* Title */}
                  <Text style={[styles.taskTitleText, { color: theme.textPrimary }, isDone && styles.taskTitleTextDone]}>
                    {task.location_enabled && <Ionicons name="location" size={15} color="#059669" />} 
                    {task.title}
                  </Text>

                  {task.source === 'whatsapp' && (
                    <Text style={[styles.whatsappSenderText, { color: theme.textSecondary }, isDone && styles.taskTitleTextDone]} numberOfLines={1}>
                      {getWhatsAppSenderLabel(task.sender)}
                    </Text>
                  )}

                  {/* Date / Time */}
                  <View style={styles.timeRow}>
                    <Ionicons name={task.location_enabled ? 'location-outline' : 'time-outline'} size={12} color={task.location_enabled ? '#059669' : '#E02424'} />
                    <Text style={[styles.timeText, darkMode && { color: '#FCA5A5' }]}>
                      {task.location_enabled
                        ? `Near: ${task.location_name} · ${task.radius === 500 ? '500 m' : task.radius === 2000 ? '2 km' : '1 km'}`
                        : task.dueTime || `${task.date}, ${task.time}`}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Quick Action Icons: View, Edit, Delete */}
                <View style={styles.quickActionsCol}>
                  <TouchableOpacity 
                    style={[styles.actionIconBtn, { backgroundColor: theme.surfaceVariant }]}
                    onPress={() => onEditTask(task)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil-outline" size={16} color="#2563EB" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionIconBtn, { backgroundColor: theme.surfaceVariant }]}
                    onPress={() => handleDeletePrompt(task)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>

              </View>
            );
          })
        )}
      </ScrollView>

      {/* Task Detail Modal for Viewing / Completing / Editing / Deleting */}
      <TaskDetailModal
        visible={!!selectedTaskForDetail}
        task={selectedTaskForDetail}
        onClose={() => setSelectedTaskForDetail(null)}
        onToggleComplete={onToggleComplete}
        onEditTask={onEditTask}
        onDeleteTask={onDeleteTask}
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
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  brandHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  screenSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  addTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 4,
  },
  addTopBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 38,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 9,
    gap: 4,
  },
  tabButtonActive: {
    backgroundColor: '#0F172A', // Dark stylish tab
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  tabBadge: {
    backgroundColor: '#CBD5E1',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  tabBadgeActive: {
    backgroundColor: '#334155',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },
  categoryFilterScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catPillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  catPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  catPillTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 110,
  },
  resultsBar: {
    marginBottom: 8,
  },
  resultsCountText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  taskCardDone: {
    backgroundColor: '#F8FAFC',
    borderColor: '#EEF2F6',
    opacity: 0.7,
  },
  checkboxTouch: {
    padding: 4,
    marginRight: 8,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkCircleDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
    flexWrap: 'wrap',
  },
  categoryTag: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    borderWidth: 1,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  statusPendingTag: {
    backgroundColor: '#FEF3C7',
  },
  statusDoneTag: {
    backgroundColor: '#D1FAE5',
  },
  statusTagText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  statusPendingTagText: {
    color: '#92400E',
  },
  statusDoneTagText: {
    color: '#065F46',
  },
  taskTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 19,
    marginBottom: 4,
  },
  taskTitleTextDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  whatsappSenderText: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11.5,
    color: '#DC2626',
    fontWeight: '600',
  },
  quickActionsCol: {
    flexDirection: 'column',
    gap: 8,
    marginLeft: 10,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#F1F5F9',
  },
  actionIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  emptyContainer: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    maxWidth: 240,
  },
  emptyCreateBtn: {
    marginTop: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  emptyCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
