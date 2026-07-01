import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { GraphNode, NODE_DEFINITIONS } from '@/services/mockData';

interface Props {
  node: GraphNode;
  onPress?: () => void;
  selected?: boolean;
}

const STATUS_COLOR: Record<string, string> = {
  idle: Colors.border,
  running: Colors.running,
  completed: Colors.completed,
  failed: Colors.error,
  paused: Colors.warning,
};

export default function NodeChip({ node, onPress, selected }: Props) {
  const def = NODE_DEFINITIONS.find(d => d.type === node.type);
  if (!def) return null;

  const statusColor = STATUS_COLOR[node.status || 'idle'];
  const isRunning = node.status === 'running';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.node,
        { borderColor: selected ? Colors.primary : def.color + '60' },
        selected && styles.selected,
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: def.color + '20' }]}>
        <MaterialCommunityIcons name={def.icon as any} size={16} color={def.color} />
      </View>
      <View style={styles.info}>
        <Text style={styles.label} numberOfLines={1}>{def.label}</Text>
        <Text style={[styles.category, { color: def.color + 'AA' }]}>{def.category}</Text>
      </View>
      <View style={[styles.status, { backgroundColor: statusColor }]}>
        {isRunning && (
          <View style={[styles.pulse, { borderColor: statusColor }]} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  node: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    minWidth: 140,
    gap: Spacing.xs,
  },
  selected: {
    backgroundColor: Colors.surface3,
    borderColor: Colors.primary,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  label: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  category: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  status: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pulse: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    top: -3,
    left: -3,
    opacity: 0.4,
  },
});
