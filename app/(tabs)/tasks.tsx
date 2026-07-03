import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, FlatList,
  TextInput, Modal, ScrollView, Animated, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useApp';
import { Task, TaskStatus, TaskPriority } from '@/services/mockData';

type FilterStatus = 'all' | TaskStatus;
type ViewMode = 'list' | 'kanban' | 'gantt';

const FILTERS: { key: FilterStatus; label: string; icon: string }[] = [
  { key: 'all', label: 'الكل', icon: 'format-list-bulleted' },
  { key: 'running', label: 'يعمل', icon: 'play-circle' },
  { key: 'pending', label: 'انتظار', icon: 'clock-outline' },
  { key: 'completed', label: 'مكتمل', icon: 'check-circle' },
  { key: 'failed', label: 'فشل', icon: 'close-circle' },
];

const PRIORITY_CONFIG: Record<TaskPriority, { color: string; label: string; icon: string }> = {
  critical: { color: Colors.error, label: 'حرج', icon: 'alert-circle' },
  high: { color: Colors.warning, label: 'عالي', icon: 'arrow-up-circle' },
  medium: { color: Colors.primary, label: 'متوسط', icon: 'minus-circle' },
  low: { color: Colors.textDim, label: 'منخفض', icon: 'arrow-down-circle' },
};

const PRIORITY_ORDER: Record<TaskPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const STATUS_CONFIG: Record<TaskStatus, { color: string; label: string; icon: string }> = {
  running: { color: Colors.running, label: 'يعمل', icon: 'play-circle' },
  pending: { color: Colors.warning, label: 'انتظار', icon: 'clock-outline' },
  completed: { color: Colors.completed, label: 'مكتمل', icon: 'check-circle' },
  failed: { color: Colors.error, label: 'فشل', icon: 'close-circle' },
};

// ── Task Card ──────────────────────────────────────────────────────
function TaskCard({
  task, onStatusChange, onDelete, onApprove, onPress,
}: {
  task: Task;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  onApprove: (id: string) => void;
  onPress: (task: Task) => void;
}) {
  const statusCfg = STATUS_CONFIG[task.status];
  const priorityCfg = PRIORITY_CONFIG[task.priority];
  const isRunning = task.status === 'running';

  return (
    <Pressable
      onPress={() => onPress(task)}
      style={({ pressed }) => [
        styles.taskCard,
        task.status === 'running' && styles.taskCardRunning,
        task.status === 'completed' && styles.taskCardCompleted,
        task.status === 'failed' && styles.taskCardFailed,
        pressed && { opacity: 0.9 },
      ]}
    >
      {/* Left priority bar */}
      <View style={[styles.priorityBar, { backgroundColor: priorityCfg.color }]} />

      <View style={styles.taskMain}>
        {/* Top row */}
        <View style={styles.taskTopRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '20', borderColor: statusCfg.color + '50' }]}>
            <MaterialCommunityIcons name={statusCfg.icon as any} size={11} color={statusCfg.color} />
            <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: priorityCfg.color + '15' }]}>
            <MaterialCommunityIcons name={priorityCfg.icon as any} size={10} color={priorityCfg.color} />
            <Text style={[styles.priorityBadgeText, { color: priorityCfg.color }]}>{priorityCfg.label}</Text>
          </View>
          {task.estimatedMinutes ? (
            <View style={styles.timeBadge}>
              <MaterialCommunityIcons name="clock-fast" size={10} color={Colors.textDim} />
              <Text style={styles.timeBadgeText}>{task.estimatedMinutes}د</Text>
            </View>
          ) : null}
          <View style={{ flex: 1 }} />
          {task.requiresApproval && !task.approvalPending && (
            <View style={styles.approvalRequired}>
              <MaterialCommunityIcons name="account-check" size={10} color={Colors.warning} />
              <Text style={styles.approvalRequiredText}>موافقة مطلوبة</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={[styles.taskTitle, task.status === 'completed' && styles.taskTitleDone]}>
          {task.title}
        </Text>

        {/* Description */}
        {task.description ? (
          <Text style={styles.taskDesc} numberOfLines={2}>{task.description}</Text>
        ) : null}

        {/* Files */}
        {task.files && task.files.length > 0 && (
          <View style={styles.filesRow}>
            <MaterialCommunityIcons name="file-multiple-outline" size={11} color={Colors.textDim} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
              {task.files.map((f, i) => (
                <View key={i} style={styles.fileChip}>
                  <Text style={styles.fileChipText} numberOfLines={1}>{f}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Approval pending */}
        {task.approvalPending && (
          <View style={styles.approvalPendingBox}>
            <MaterialCommunityIcons name="account-question" size={14} color={Colors.warning} />
            <Text style={styles.approvalPendingText}>في انتظار موافقتك</Text>
            <Pressable onPress={() => onApprove(task.id)} style={styles.approveBtn}>
              <MaterialCommunityIcons name="check" size={13} color={Colors.success} />
              <Text style={styles.approveBtnText}>موافقة</Text>
            </Pressable>
            <Pressable onPress={() => onDelete(task.id)} style={styles.rejectBtn}>
              <MaterialCommunityIcons name="close" size={13} color={Colors.error} />
            </Pressable>
          </View>
        )}

        {/* Actions */}
        <View style={styles.taskActions}>
          {task.status === 'pending' && (
            <Pressable onPress={() => onStatusChange(task.id, 'running')} style={styles.taskActionBtn}>
              <MaterialCommunityIcons name="play" size={13} color={Colors.running} />
              <Text style={[styles.taskActionText, { color: Colors.running }]}>تشغيل</Text>
            </Pressable>
          )}
          {task.status === 'running' && (
            <Pressable onPress={() => onStatusChange(task.id, 'completed')} style={styles.taskActionBtn}>
              <MaterialCommunityIcons name="check" size={13} color={Colors.success} />
              <Text style={[styles.taskActionText, { color: Colors.success }]}>إنهاء</Text>
            </Pressable>
          )}
          {task.status !== 'completed' && task.status !== 'failed' && (
            <Pressable onPress={() => onStatusChange(task.id, 'failed')} style={styles.taskActionBtn}>
              <MaterialCommunityIcons name="close" size={13} color={Colors.error} />
              <Text style={[styles.taskActionText, { color: Colors.error }]}>فشل</Text>
            </Pressable>
          )}
          {task.status === 'failed' && (
            <Pressable onPress={() => onStatusChange(task.id, 'pending')} style={styles.taskActionBtn}>
              <MaterialCommunityIcons name="refresh" size={13} color={Colors.primary} />
              <Text style={[styles.taskActionText, { color: Colors.primary }]}>إعادة</Text>
            </Pressable>
          )}
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => onDelete(task.id)} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="trash-can-outline" size={14} color={Colors.error + '80'} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// ── Kanban Column ──────────────────────────────────────────────────
function KanbanColumn({
  title, color, icon, tasks, onStatusChange, onDelete, onApprove, onPress
}: {
  title: string; color: string; icon: string; tasks: Task[];
  onStatusChange: (id: string, s: TaskStatus) => void;
  onDelete: (id: string) => void;
  onApprove: (id: string) => void;
  onPress: (t: Task) => void;
}) {
  return (
    <View style={styles.kanbanCol}>
      <View style={[styles.kanbanHeader, { borderTopColor: color }]}>
        <MaterialCommunityIcons name={icon as any} size={13} color={color} />
        <Text style={[styles.kanbanTitle, { color }]}>{title}</Text>
        <View style={[styles.kanbanCount, { backgroundColor: color + '20' }]}>
          <Text style={[styles.kanbanCountText, { color }]}>{tasks.length}</Text>
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {tasks.map(t => (
          <View key={t.id} style={styles.kanbanCard}>
            <View style={[styles.kanbanPriorityDot, { backgroundColor: PRIORITY_CONFIG[t.priority].color }]} />
            <Text style={styles.kanbanCardTitle} numberOfLines={2}>{t.title}</Text>
            {t.estimatedMinutes ? <Text style={styles.kanbanTime}>{t.estimatedMinutes}د</Text> : null}
          </View>
        ))}
        {tasks.length === 0 && (
          <View style={styles.kanbanEmpty}>
            <Text style={styles.kanbanEmptyText}>لا يوجد</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Main Tasks Screen ──────────────────────────────────────────────
export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const {
    tasks, addTask, updateTaskStatus, deleteTask, approveTask,
    addNotification, pipelineLogs, isPipelineRunning, navigateToTab,
    clearAllTasks,
  } = useApp();

  const [filter, setFilter] = useState<FilterStatus>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [needsApproval, setNeedsApproval] = useState(false);
  const [newEstimate, setNewEstimate] = useState('');
  const [showPipelineLogs, setShowPipelineLogs] = useState(false);

  const filtered = tasks
    .filter(t => {
      const matchesFilter = filter === 'all' || t.status === filter;
      const matchesSearch = !searchQuery.trim() || [t.title, t.description, ...(t.files || [])]
        .some(field => String(field || '').toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const runningCount = tasks.filter(t => t.status === 'running').length;
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const failedCount = tasks.filter(t => t.status === 'failed').length;
  const progress = tasks.length > 0 ? completedCount / tasks.length : 0;
  const pendingApprovals = tasks.filter(t => t.approvalPending);

  const totalEst = filtered.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addTask({
      title: newTitle.trim(),
      description: newDesc.trim() || '',
      status: 'pending',
      priority: newPriority,
      files: [],
      requiresApproval: needsApproval,
      approvalPending: needsApproval,
      estimatedMinutes: newEstimate ? parseInt(newEstimate) : undefined,
    });
    setNewTitle(''); setNewDesc(''); setNewPriority('medium');
    setNeedsApproval(false); setNewEstimate('');
    setShowAdd(false);
    addNotification({ type: 'info', title: 'تمت إضافة مهمة', message: newTitle, screen: 'tasks' });
  };

  const handleApprove = (id: string) => {
    approveTask(id);
    addNotification({ type: 'success', title: 'تمت الموافقة', message: 'تم بدء التنفيذ', screen: 'tasks' });
  };

  const pipelineTaskLogs = pipelineLogs.filter(l => ['n8', 'n9', 'n16'].includes(l.nodeId));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>المهام</Text>
          <Text style={styles.headerSub}>{completedCount}/{tasks.length} مكتمل • ~{totalEst}د</Text>
        </View>
        <View style={styles.headerActions}>
          {isPipelineRunning && (
            <Pressable onPress={() => setShowPipelineLogs(v => !v)}
              style={[styles.pipelineBtn, showPipelineLogs && styles.pipelineBtnActive]}>
              <View style={styles.pipelineDot} />
              <Text style={styles.pipelineBtnText}>Pipeline</Text>
            </Pressable>
          )}
          {tasks.length > 0 && (
            <Pressable onPress={() => setShowDeleteAll(true)} style={styles.deleteAllBtn}>
              <MaterialCommunityIcons name="trash-can-outline" size={15} color={Colors.error} />
            </Pressable>
          )}
          <Pressable
            onPress={() => setViewMode(v => v === 'list' ? 'kanban' : v === 'kanban' ? 'gantt' : 'list')}
            style={styles.viewBtn}
          >
            <MaterialCommunityIcons
              name={viewMode === 'list' ? 'view-list' : viewMode === 'kanban' ? 'view-column' : 'chart-gantt'}
              size={17} color={Colors.textMuted}
            />
          </Pressable>
          <Pressable onPress={() => setShowAdd(true)} style={styles.addBtn}>
            <MaterialCommunityIcons name="plus" size={18} color="#fff" />
            <Text style={styles.addBtnText}>مهمة</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={15} color={Colors.textDim} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="ابحث في المهام..."
          placeholderTextColor={Colors.textDim}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {searchQuery.trim().length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="close-circle" size={18} color={Colors.textDim} />
          </Pressable>
        )}
      </View>
      {searchQuery.trim().length > 0 && (
        <View style={styles.searchInfoBadge}>
          <Text style={styles.searchInfoText}>{filtered.length} نتيجة لـ "{searchQuery.trim()}"</Text>
        </View>
      )}

      {/* Pipeline live logs */}
      {showPipelineLogs && pipelineLogs.length > 0 && (
        <View style={styles.pipelineLogsBox}>
          <View style={styles.pipelineLogsHeader}>
            <MaterialCommunityIcons name="robot" size={12} color={Colors.running} />
            <Text style={styles.pipelineLogsTitle}>سجل Pipeline الحي</Text>
            <Pressable onPress={() => setShowPipelineLogs(false)} style={{ marginLeft: 'auto' as any }}>
              <MaterialCommunityIcons name="close" size={14} color={Colors.textDim} />
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 100 }} showsVerticalScrollIndicator={false}>
            {pipelineLogs.slice(-15).map((l, i) => (
              <Text key={l.id} style={[styles.pipelineLogLine, {
                color: l.type === 'success' ? Colors.success : l.type === 'error' ? Colors.error : l.type === 'running' ? Colors.running : Colors.textMuted
              }]}>
                {l.type === 'success' ? '✓' : l.type === 'error' ? '✗' : l.type === 'running' ? '▶' : '·'} {l.message}
              </Text>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Progress section */}
      <View style={styles.progressSection}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressCompleted, { width: `${progress * 100}%` as any }]} />
          {runningCount > 0 && (
            <View style={[styles.progressRunning, {
              width: `${(runningCount / Math.max(tasks.length, 1)) * 100}%` as any,
              left: `${progress * 100}%` as any
            }]} />
          )}
        </View>
        <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'إجمالي', value: tasks.length, color: Colors.textMuted },
          { label: 'يعمل', value: runningCount, color: Colors.running },
          { label: 'انتظار', value: pendingCount, color: Colors.warning },
          { label: 'مكتمل', value: completedCount, color: Colors.success },
          { label: 'فشل', value: failedCount, color: Colors.error },
        ].map((s, i) => (
          <Pressable key={s.label} onPress={() => setFilter(
            i === 0 ? 'all' : i === 1 ? 'running' : i === 2 ? 'pending' : i === 3 ? 'completed' : 'failed'
          )} style={[styles.statCard, filter === (i === 0 ? 'all' : i === 1 ? 'running' : i === 2 ? 'pending' : i === 3 ? 'completed' : 'failed') && { backgroundColor: s.color + '15', borderColor: s.color + '40' }]}>
            <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Pending approvals banner */}
      {pendingApprovals.length > 0 && (
        <View style={styles.approvalBanner}>
          <MaterialCommunityIcons name="account-question" size={16} color={Colors.warning} />
          <Text style={styles.approvalBannerText}>{pendingApprovals.length} مهمة تنتظر موافقتك</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.approvalScroll}>
            {pendingApprovals.map(t => (
              <View key={t.id} style={styles.approvalCard}>
                <Text style={styles.approvalCardTitle} numberOfLines={1}>{t.title}</Text>
                <View style={styles.approvalCardBtns}>
                  <Pressable onPress={() => handleApprove(t.id)} style={styles.approvalYes}>
                    <MaterialCommunityIcons name="check" size={12} color={Colors.success} />
                    <Text style={styles.approvalYesText}>موافقة</Text>
                  </Pressable>
                  <Pressable onPress={() => deleteTask(t.id)} style={styles.approvalNo}>
                    <MaterialCommunityIcons name="close" size={12} color={Colors.error} />
                  </Pressable>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterBar} contentContainerStyle={styles.filterBarContent}>
        {FILTERS.map(f => {
          const cnt = f.key === 'all' ? tasks.length : tasks.filter(t => t.status === f.key).length;
          const col = f.key === 'running' ? Colors.running : f.key === 'completed' ? Colors.success : f.key === 'failed' ? Colors.error : f.key === 'pending' ? Colors.warning : Colors.primary;
          return (
            <Pressable key={f.key} onPress={() => setFilter(f.key)}
              style={[styles.filterChip, filter === f.key && { backgroundColor: col + '20', borderColor: col }]}>
              <MaterialCommunityIcons name={f.icon as any} size={11} color={filter === f.key ? col : Colors.textDim} />
              <Text style={[styles.filterChipText, filter === f.key && { color: col }]}>{f.label} ({cnt})</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Content */}
      {viewMode === 'list' && (
        <FlatList
          data={filtered}
          keyExtractor={t => t.id}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onStatusChange={updateTaskStatus}
              onDelete={deleteTask}
              onApprove={handleApprove}
              onPress={setSelectedTask}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="checkbox-blank-outline" size={52} color={Colors.textDim} />
              <Text style={styles.emptyTitle}>لا توجد مهام</Text>
              <Text style={styles.emptySub}>سيتم إنشاء المهام تلقائياً عند تشغيل Pipeline</Text>
              <Pressable onPress={() => navigateToTab('autodev')} style={styles.emptyBtn}>
                <MaterialCommunityIcons name="rocket-launch" size={16} color={Colors.primary} />
                <Text style={styles.emptyBtnText}>الذهاب إلى Auto Dev</Text>
              </Pressable>
            </View>
          }
        />
      )}

      {viewMode === 'kanban' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}
          contentContainerStyle={styles.kanbanBoard}>
          {(['pending', 'running', 'completed', 'failed'] as TaskStatus[]).map(s => (
            <KanbanColumn
              key={s}
              title={STATUS_CONFIG[s].label}
              color={STATUS_CONFIG[s].color}
              icon={STATUS_CONFIG[s].icon}
              tasks={tasks.filter(t => t.status === s)}
              onStatusChange={updateTaskStatus}
              onDelete={deleteTask}
              onApprove={handleApprove}
              onPress={setSelectedTask}
            />
          ))}
        </ScrollView>
      )}

      {viewMode === 'gantt' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.sm }}>
          <Text style={styles.ganttTitle}>مخطط التقدم الزمني (Gantt)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ gap: Spacing.sm, minWidth: 400 }}>
              {tasks.map((task, idx) => {
                const barW = Math.max(60, (task.estimatedMinutes || 5) * 10);
                const offset = Math.min(idx * 6, 80);
                const barColor = task.status === 'completed' ? Colors.success
                  : task.status === 'running' ? Colors.running
                  : task.status === 'failed' ? Colors.error
                  : Colors.textDim + '40';
                return (
                  <View key={task.id} style={styles.ganttRow}>
                    <Text style={styles.ganttLabel} numberOfLines={1}>{task.title}</Text>
                    <View style={styles.ganttTrack}>
                      <View style={[styles.ganttBar, { width: barW, marginLeft: offset, backgroundColor: barColor }]}>
                        {task.estimatedMinutes ? (
                          <Text style={styles.ganttBarText}>{task.estimatedMinutes}د</Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </ScrollView>
      )}

      {/* Activity Log */}
      <View style={styles.activityLog}>
        <View style={styles.activityHeader}>
          <MaterialCommunityIcons name="history" size={12} color={Colors.textDim} />
          <Text style={styles.activityTitle}>نشاط حديث</Text>
          {completedCount > 0 && (
            <Text style={[styles.activityStat, { color: Colors.success }]}>{completedCount} مكتمل</Text>
          )}
          {runningCount > 0 && (
            <Text style={[styles.activityStat, { color: Colors.running }]}>• {runningCount} يعمل</Text>
          )}
        </View>
        {pipelineLogs.filter(l => l.type === 'success').slice(-2).map(l => (
          <Text key={l.id} style={styles.activityLine}>✓ {l.timestamp} — {l.message.substring(0, 60)}</Text>
        ))}
        {pipelineLogs.length === 0 && (
          <Text style={styles.activityLine}>لا يوجد نشاط حديث — قم بتشغيل Pipeline</Text>
        )}
      </View>

      {/* Delete All Confirmation */}
      <Modal visible={showDeleteAll} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 220 }]}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="trash-can-outline" size={20} color={Colors.error} />
              <Text style={[styles.modalTitle, { color: Colors.error }]}>حذف جميع المهام</Text>
            </View>
            <Text style={{ color: Colors.textMuted, fontSize: FontSize.md, paddingHorizontal: 4 }}>
              سيتم حذف {tasks.length} مهمة بشكل نهائي. هل أنت متأكد؟
            </Text>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowDeleteAll(false)}
                style={[styles.modalActionBtn, { backgroundColor: Colors.surface2 }]}>
                <Text style={styles.modalActionText}>إلغاء</Text>
              </Pressable>
              <Pressable onPress={() => {
                clearAllTasks();
                setShowDeleteAll(false);
                addNotification({ type: 'warning', title: 'تم حذف جميع المهام', message: `${tasks.length} مهمة محذوفة`, screen: 'tasks' });
              }} style={[styles.modalActionBtn, { backgroundColor: Colors.errorDim, borderColor: Colors.error + '60', borderWidth: 1 }]}>
                <MaterialCommunityIcons name="trash-can" size={16} color={Colors.error} />
                <Text style={[styles.modalActionText, { color: Colors.error }]}>حذف الكل</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Task Detail Modal */}
      <Modal visible={!!selectedTask} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedTask && (
              <>
                <View style={styles.modalHeader}>
                  <View style={[styles.modalPriorityDot, { backgroundColor: PRIORITY_CONFIG[selectedTask.priority].color }]} />
                  <Text style={styles.modalTitle} numberOfLines={2}>{selectedTask.title}</Text>
                  <Pressable onPress={() => setSelectedTask(null)}>
                    <MaterialCommunityIcons name="close" size={22} color={Colors.textMuted} />
                  </Pressable>
                </View>
                <View style={styles.modalBadgesRow}>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[selectedTask.status].color + '20', borderColor: STATUS_CONFIG[selectedTask.status].color + '50' }]}>
                    <Text style={[styles.statusBadgeText, { color: STATUS_CONFIG[selectedTask.status].color }]}>{STATUS_CONFIG[selectedTask.status].label}</Text>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_CONFIG[selectedTask.priority].color + '15' }]}>
                    <Text style={[styles.priorityBadgeText, { color: PRIORITY_CONFIG[selectedTask.priority].color }]}>{PRIORITY_CONFIG[selectedTask.priority].label}</Text>
                  </View>
                  {selectedTask.estimatedMinutes ? (
                    <Text style={styles.modalTime}>⏱ {selectedTask.estimatedMinutes} دقيقة</Text>
                  ) : null}
                </View>
                {selectedTask.description ? (
                  <Text style={styles.modalDesc}>{selectedTask.description}</Text>
                ) : null}
                {selectedTask.prompt ? (
                  <View style={styles.modalPromptBox}>
                    <Text style={styles.modalPromptLabel}>برومبت AI:</Text>
                    <ScrollView style={{ maxHeight: 100 }}>
                      <Text style={styles.modalPromptText}>{selectedTask.prompt}</Text>
                    </ScrollView>
                  </View>
                ) : null}
                {selectedTask.files && selectedTask.files.length > 0 && (
                  <View style={styles.modalFilesBox}>
                    <Text style={styles.modalFilesLabel}>الملفات المرتبطة:</Text>
                    {selectedTask.files.map((f, i) => (
                      <View key={i} style={styles.modalFileRow}>
                        <MaterialCommunityIcons name="file-outline" size={13} color={Colors.primary} />
                        <Text style={styles.modalFileName}>{f}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <View style={styles.modalActions}>
                  {selectedTask.status === 'pending' && (
                    <Pressable onPress={() => { updateTaskStatus(selectedTask.id, 'running'); setSelectedTask(null); }}
                      style={[styles.modalActionBtn, { backgroundColor: Colors.running + '20' }]}>
                      <MaterialCommunityIcons name="play" size={16} color={Colors.running} />
                      <Text style={[styles.modalActionText, { color: Colors.running }]}>تشغيل</Text>
                    </Pressable>
                  )}
                  {selectedTask.status === 'running' && (
                    <Pressable onPress={() => { updateTaskStatus(selectedTask.id, 'completed'); setSelectedTask(null); }}
                      style={[styles.modalActionBtn, { backgroundColor: Colors.success + '20' }]}>
                      <MaterialCommunityIcons name="check" size={16} color={Colors.success} />
                      <Text style={[styles.modalActionText, { color: Colors.success }]}>إنهاء</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => { deleteTask(selectedTask.id); setSelectedTask(null); }}
                    style={[styles.modalActionBtn, { backgroundColor: Colors.errorDim }]}>
                    <MaterialCommunityIcons name="trash-can-outline" size={16} color={Colors.error} />
                    <Text style={[styles.modalActionText, { color: Colors.error }]}>حذف</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Task Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>مهمة جديدة</Text>
              <Pressable onPress={() => setShowAdd(false)}>
                <MaterialCommunityIcons name="close" size={22} color={Colors.textMuted} />
              </Pressable>
            </View>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>العنوان *</Text>
              <TextInput value={newTitle} onChangeText={setNewTitle}
                placeholder="عنوان المهمة..." placeholderTextColor={Colors.textDim} style={styles.input} />
            </View>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>الوصف</Text>
              <TextInput value={newDesc} onChangeText={setNewDesc}
                placeholder="وصف تفصيلي..." placeholderTextColor={Colors.textDim}
                style={[styles.input, styles.inputMulti]} multiline numberOfLines={3} textAlignVertical="top" />
            </View>
            <View style={styles.formRow}>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>الأولوية</Text>
                <View style={styles.priorityRow}>
                  {(['critical', 'high', 'medium', 'low'] as TaskPriority[]).map(p => (
                    <Pressable key={p} onPress={() => setNewPriority(p)}
                      style={[styles.priorityChip, newPriority === p && { backgroundColor: PRIORITY_CONFIG[p].color + '25', borderColor: PRIORITY_CONFIG[p].color }]}>
                      <Text style={[styles.priorityChipText, newPriority === p && { color: PRIORITY_CONFIG[p].color }]}>{PRIORITY_CONFIG[p].label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={[styles.formField, { width: 90 }]}>
                <Text style={styles.fieldLabel}>مدة (دقيقة)</Text>
                <TextInput value={newEstimate} onChangeText={setNewEstimate}
                  placeholder="15" placeholderTextColor={Colors.textDim}
                  style={styles.input} keyboardType="numeric" />
              </View>
            </View>
            <Pressable onPress={() => setNeedsApproval(v => !v)}
              style={[styles.approvalToggle, needsApproval && styles.approvalToggleActive]}>
              <MaterialCommunityIcons name={needsApproval ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={18} color={needsApproval ? Colors.primary : Colors.textDim} />
              <Text style={[styles.approvalToggleText, needsApproval && { color: Colors.primary }]}>
                تتطلب موافقة بشرية قبل التنفيذ
              </Text>
            </Pressable>
            <Pressable onPress={handleAdd}
              style={[styles.submitBtn, !newTitle.trim() && styles.submitBtnDisabled]} disabled={!newTitle.trim()}>
              <MaterialCommunityIcons name="plus" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>إضافة المهمة</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: '700' },
  headerSub: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  pipelineBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.running + '20', borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.running + '40',
  },
  pipelineBtnActive: { backgroundColor: Colors.running + '30' },
  pipelineDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.running },
  pipelineBtnText: { color: Colors.running, fontSize: FontSize.xs, fontWeight: '700' },
  viewBtn: { padding: Spacing.sm, borderRadius: Radius.sm, backgroundColor: Colors.surface2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  addBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },

  pipelineLogsBox: {
    backgroundColor: Colors.bg, borderBottomWidth: 1, borderBottomColor: Colors.running + '30',
    borderLeftWidth: 3, borderLeftColor: Colors.running,
  },
  pipelineLogsHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.lg, paddingVertical: 6,
    backgroundColor: Colors.running + '10',
  },
  pipelineLogsTitle: { color: Colors.running, fontSize: FontSize.xs, fontWeight: '700', flex: 1 },
  pipelineLogLine: {
    fontSize: FontSize.xs, lineHeight: 18, paddingHorizontal: Spacing.lg,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  progressSection: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  progressTrack: {
    flex: 1, height: 8, backgroundColor: Colors.surface3,
    borderRadius: Radius.full, overflow: 'hidden', position: 'relative',
  },
  progressCompleted: { height: 8, backgroundColor: Colors.success, position: 'absolute', left: 0 },
  progressRunning: { height: 8, backgroundColor: Colors.running, position: 'absolute', opacity: 0.7 },
  progressPct: { color: Colors.success, fontSize: FontSize.sm, fontWeight: '700', minWidth: 38, textAlign: 'right' },

  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.surface2,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.sm,
    borderRightWidth: 1, borderRightColor: Colors.border,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  statVal: { fontSize: FontSize.xl, fontWeight: '800' },
  statLabel: { color: Colors.textDim, fontSize: 10, marginTop: 1 },

  approvalBanner: {
    backgroundColor: Colors.warningDim, borderBottomWidth: 1, borderBottomColor: Colors.warning + '40',
    padding: Spacing.sm, paddingHorizontal: Spacing.lg, gap: Spacing.xs,
  },
  approvalBannerText: { color: Colors.warning, fontSize: FontSize.xs, fontWeight: '700' },
  approvalScroll: { gap: Spacing.sm, paddingVertical: 2 },
  approvalCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.sm,
    minWidth: 160, borderWidth: 1, borderColor: Colors.warning + '40',
  },
  approvalCardTitle: { color: Colors.text, fontSize: FontSize.xs, fontWeight: '600', marginBottom: 4 },
  approvalCardBtns: { flexDirection: 'row', gap: Spacing.xs },
  approvalYes: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3,
    backgroundColor: Colors.successDim, borderRadius: Radius.sm, paddingVertical: 3,
  },
  approvalYesText: { color: Colors.success, fontSize: 10, fontWeight: '600' },
  approvalNo: {
    width: 24, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.errorDim, borderRadius: Radius.sm,
  },

  filterBar: { maxHeight: 42, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  filterBarContent: { alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.md, paddingVertical: 5,
    borderRadius: Radius.full, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
  },
  filterChipText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '500' },

  listContent: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 80 },

  // Task Card
  taskCard: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  taskCardRunning: { borderColor: Colors.running + '60', backgroundColor: Colors.running + '05' },
  taskCardCompleted: { borderColor: Colors.success + '40', opacity: 0.85 },
  taskCardFailed: { borderColor: Colors.error + '50', backgroundColor: Colors.error + '04' },
  priorityBar: { width: 4 },
  taskMain: { flex: 1, padding: Spacing.md, gap: Spacing.xs },
  taskTopRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full, borderWidth: 1,
  },
  statusBadgeText: { fontSize: 9, fontWeight: '700' },
  priorityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: Radius.sm,
  },
  priorityBadgeText: { fontSize: 9, fontWeight: '600' },
  timeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: Colors.surface2, borderRadius: Radius.sm, paddingHorizontal: 5, paddingVertical: 2,
  },
  timeBadgeText: { color: Colors.textDim, fontSize: 9 },
  approvalRequired: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: Colors.warningDim, borderRadius: Radius.sm, paddingHorizontal: 5, paddingVertical: 2,
  },
  approvalRequiredText: { color: Colors.warning, fontSize: 9, fontWeight: '600' },
  taskTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', lineHeight: 20 },
  taskTitleDone: { textDecorationLine: 'line-through', color: Colors.textMuted },
  taskDesc: { color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 17 },
  filesRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  fileChip: {
    backgroundColor: Colors.surface2, borderRadius: Radius.sm,
    paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: Colors.border,
  },
  fileChipText: { color: Colors.textDim, fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  approvalPendingBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.warningDim, borderRadius: Radius.sm,
    padding: Spacing.sm, borderWidth: 1, borderColor: Colors.warning + '40',
  },
  approvalPendingText: { color: Colors.warning, fontSize: FontSize.xs, flex: 1 },
  approveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: Colors.successDim, borderRadius: Radius.sm, paddingHorizontal: 6, paddingVertical: 3,
  },
  approveBtnText: { color: Colors.success, fontSize: FontSize.xs, fontWeight: '600' },
  rejectBtn: {
    width: 24, height: 24, backgroundColor: Colors.errorDim,
    borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center',
  },
  taskActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: 2 },
  taskActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm, backgroundColor: Colors.surface2,
  },
  taskActionText: { fontSize: FontSize.xs, fontWeight: '600' },
  deleteBtn: { padding: 3 },
  deleteAllBtn: { padding: Spacing.sm, borderRadius: Radius.sm, backgroundColor: Colors.errorDim, borderWidth: 1, borderColor: Colors.error + '40' },

  // Kanban
  kanbanBoard: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.lg, gap: Spacing.md, alignItems: 'flex-start' },
  kanbanCol: {
    width: 200, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', maxHeight: 500,
  },
  kanbanHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    padding: Spacing.md, borderTopWidth: 3, backgroundColor: Colors.surface2,
  },
  kanbanTitle: { flex: 1, fontSize: FontSize.sm, fontWeight: '700' },
  kanbanCount: { borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 2 },
  kanbanCountText: { fontSize: 10, fontWeight: '700' },
  kanbanCard: {
    margin: Spacing.sm, padding: Spacing.sm, backgroundColor: Colors.bg,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
  },
  kanbanPriorityDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  kanbanCardTitle: { color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 16 },
  kanbanTime: { color: Colors.textDim, fontSize: 9, marginTop: 2 },
  kanbanEmpty: { padding: Spacing.lg, alignItems: 'center' },
  kanbanEmptyText: { color: Colors.textDim, fontSize: FontSize.xs },

  // Gantt
  ganttTitle: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '700', marginBottom: Spacing.md },
  ganttRow: { flexDirection: 'row', alignItems: 'center', height: 32 },
  ganttLabel: { color: Colors.textMuted, fontSize: FontSize.xs, width: 130 },
  ganttTrack: { flex: 1, height: 24 },
  ganttBar: { height: 24, borderRadius: Radius.sm, justifyContent: 'center', paddingHorizontal: Spacing.xs },
  ganttBarText: { color: '#fff', fontSize: 9, fontWeight: '600' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
  emptyTitle: { color: Colors.textMuted, fontSize: FontSize.xl, fontWeight: '700' },
  emptySub: { color: Colors.textDim, fontSize: FontSize.sm, textAlign: 'center' },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primaryDim, borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary + '50', marginTop: Spacing.sm,
  },
  emptyBtnText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: '600' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1, color: Colors.text, fontSize: FontSize.md,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  searchInfoBadge: {
    marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
    backgroundColor: Colors.primaryDim, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
  },
  searchInfoText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600' },

  // Activity Log
  activityLog: {
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg, paddingTop: 6, paddingBottom: 8,
  },
  activityHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 3 },
  activityTitle: { color: Colors.textDim, fontSize: FontSize.xs, fontWeight: '700', flex: 1 },
  activityStat: { fontSize: FontSize.xs, fontWeight: '600' },
  activityLine: {
    color: Colors.textDim, fontSize: FontSize.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md, maxHeight: '82%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  modalPriorityDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  modalTitle: { flex: 1, color: Colors.text, fontSize: FontSize.xl, fontWeight: '700', lineHeight: 26 },
  modalBadgesRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  modalTime: { color: Colors.textDim, fontSize: FontSize.xs },
  modalDesc: { color: Colors.textMuted, fontSize: FontSize.md, lineHeight: 22 },
  modalPromptBox: {
    backgroundColor: Colors.bg, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  modalPromptLabel: { color: Colors.textDim, fontSize: FontSize.xs, fontWeight: '700', marginBottom: 4 },
  modalPromptText: { color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 18, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  modalFilesBox: { gap: Spacing.xs },
  modalFilesLabel: { color: Colors.textDim, fontSize: FontSize.xs, fontWeight: '700' },
  modalFileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  modalFileName: { color: Colors.textMuted, fontSize: FontSize.xs, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  modalActions: { flexDirection: 'row', gap: Spacing.md },
  modalActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    backgroundColor: Colors.surface2, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  modalActionText: { color: Colors.textMuted, fontSize: FontSize.md, fontWeight: '600' },

  // Add Form
  formField: { gap: 6 },
  formRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  fieldLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' },
  input: {
    backgroundColor: Colors.surface2, borderRadius: Radius.md, padding: Spacing.md,
    color: Colors.text, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border,
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
  priorityRow: { flexDirection: 'row', gap: Spacing.xs },
  priorityChip: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.sm,
    borderRadius: Radius.md, backgroundColor: Colors.surface2,
    borderWidth: 1, borderColor: Colors.border,
  },
  priorityChipText: { color: Colors.textMuted, fontSize: 10, fontWeight: '600' },
  approvalToggle: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.surface2,
    borderWidth: 1, borderColor: Colors.border,
  },
  approvalToggleActive: { backgroundColor: Colors.primaryDim, borderColor: Colors.primary },
  approvalToggleText: { color: Colors.textMuted, fontSize: FontSize.sm },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.lg,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '700' },
});
