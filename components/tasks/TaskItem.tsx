import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { Task, TaskStatus } from '@/services/mockData';

const STATUS_CONFIG: Record<TaskStatus, { icon: string; color: string; label: string; bg: string }> = {
  pending: { icon: 'clock-outline', color: Colors.textDim, label: 'انتظار', bg: Colors.surface3 },
  running: { icon: 'play-circle', color: Colors.running, label: 'يعمل', bg: Colors.primaryDim },
  completed: { icon: 'check-circle', color: Colors.completed, label: 'مكتمل', bg: Colors.successDim },
  failed: { icon: 'close-circle', color: Colors.error, label: 'فشل', bg: Colors.errorDim },
};

interface Props {
  task: Task;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  onPress: () => void;
}

export default function TaskItem({ task, onStatusChange, onDelete, onPress }: Props) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[task.status];

  return (
    <Pressable
      onPress={() => { onPress(); setExpanded(v => !v); }}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={[styles.statusBar, { backgroundColor: cfg.color }]} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Pressable
            onPress={() => onStatusChange(task.id, task.status === 'completed' ? 'pending' : 'completed')}
            style={[styles.statusIcon, { backgroundColor: cfg.bg }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name={cfg.icon as any} size={18} color={cfg.color} />
          </Pressable>

          <View style={styles.info}>
            <Text style={[styles.title, task.status === 'completed' && styles.titleDone]}
              numberOfLines={1}>
              {task.title}
            </Text>
            <Text style={styles.desc} numberOfLines={expanded ? undefined : 1}>
              {task.description}
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={() => onDelete(task.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={16} color={Colors.textDim} />
            </Pressable>
            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.textDim}
            />
          </View>
        </View>

        {expanded && (
          <View style={styles.details}>
            {task.prompt && (
              <View style={styles.promptBox}>
                <MaterialCommunityIcons name="brain" size={12} color={Colors.accent} />
                <Text style={styles.prompt} numberOfLines={3}>{task.prompt}</Text>
              </View>
            )}
            <View style={styles.filesRow}>
              <Text style={styles.filesLabel}>الملفات المرتبطة:</Text>
              {task.files.map(f => (
                <View key={f} style={styles.fileChip}>
                  <MaterialCommunityIcons name="file-outline" size={10} color={Colors.primary} />
                  <Text style={styles.fileChipText}>{f}</Text>
                </View>
              ))}
            </View>
            <View style={styles.statusOptions}>
              {(['pending', 'running', 'completed', 'failed'] as TaskStatus[]).map(s => (
                <Pressable
                  key={s}
                  onPress={() => onStatusChange(task.id, s)}
                  style={[
                    styles.statusOpt,
                    task.status === s && { backgroundColor: STATUS_CONFIG[s].bg, borderColor: STATUS_CONFIG[s].color },
                  ]}
                >
                  <Text style={[styles.statusOptText, task.status === s && { color: STATUS_CONFIG[s].color }]}>
                    {STATUS_CONFIG[s].label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressed: { opacity: 0.9 },
  statusBar: { width: 3 },
  content: { flex: 1, padding: Spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, gap: 3 },
  title: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600' },
  titleDone: { textDecorationLine: 'line-through', color: Colors.textDim },
  desc: { color: Colors.textMuted, fontSize: FontSize.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  details: { marginTop: Spacing.md, gap: Spacing.sm },
  promptBox: {
    flexDirection: 'row',
    gap: Spacing.xs,
    backgroundColor: Colors.accentDim,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.accent + '40',
  },
  prompt: { color: Colors.textMuted, fontSize: FontSize.xs, flex: 1, lineHeight: 18 },
  filesRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.xs },
  filesLabel: { color: Colors.textDim, fontSize: FontSize.xs },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surface2,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fileChipText: { color: Colors.primary, fontSize: FontSize.xs },
  statusOptions: { flexDirection: 'row', gap: Spacing.xs },
  statusOpt: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusOptText: { color: Colors.textDim, fontSize: FontSize.xs },
});
