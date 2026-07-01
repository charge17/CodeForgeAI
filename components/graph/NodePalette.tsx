import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { NODE_DEFINITIONS, NodeCategory } from '@/services/mockData';

interface Props {
  onAddNode: (type: string) => void;
  onClose: () => void;
}

const CATEGORY_COLORS: Record<NodeCategory, string> = {
  Trigger: Colors.success,
  AI: Colors.nodeAI,
  Browser: Colors.nodeBrowser,
  File: Colors.nodeFile,
  Task: Colors.nodeTask,
  Logic: Colors.nodeLogic,
  Advanced: Colors.nodeData,
};

const CATEGORY_ICONS: Record<NodeCategory, string> = {
  Trigger: 'play-circle',
  AI: 'brain',
  Browser: 'web',
  File: 'folder-open',
  Task: 'checkbox-marked',
  Logic: 'source-branch',
  Advanced: 'lightning-bolt',
};

export default function NodePalette({ onAddNode, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<NodeCategory | 'All'>('All');

  const categories: (NodeCategory | 'All')[] = ['All', 'Trigger', 'AI', 'Browser', 'File', 'Task', 'Logic', 'Advanced'];

  const filtered = NODE_DEFINITIONS.filter(def => {
    const matchCat = activeCategory === 'All' || def.category === activeCategory;
    const matchSearch = !search || def.label.toLowerCase().includes(search.toLowerCase()) || def.description.includes(search);
    return matchCat && matchSearch;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="view-grid-plus" size={16} color={Colors.primary} />
        <Text style={styles.headerTitle}>إضافة عقدة</Text>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <MaterialCommunityIcons name="close" size={18} color={Colors.textMuted} />
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={14} color={Colors.textMuted} />
        <TextInput
          value={search} onChangeText={setSearch}
          placeholder="بحث في العقد..." placeholderTextColor={Colors.textDim}
          style={styles.searchInput} autoCapitalize="none"
        />
        {search ? (
          <Pressable onPress={() => setSearch('')}>
            <MaterialCommunityIcons name="close" size={14} color={Colors.textDim} />
          </Pressable>
        ) : null}
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.catScroll} contentContainerStyle={styles.catScrollContent}
      >
        {categories.map(cat => {
          const color = cat === 'All' ? Colors.primary : CATEGORY_COLORS[cat as NodeCategory];
          return (
            <Pressable
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={[styles.catChip, activeCategory === cat && { backgroundColor: color + '22', borderColor: color }]}
            >
              {cat !== 'All' && (
                <MaterialCommunityIcons
                  name={CATEGORY_ICONS[cat as NodeCategory] as any} size={11}
                  color={activeCategory === cat ? color : Colors.textDim}
                />
              )}
              <Text style={[styles.catLabel, activeCategory === cat && { color }]}>
                {cat === 'All' ? 'الكل' : cat}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Node list */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {filtered.map(def => (
          <Pressable
            key={def.type}
            onPress={() => onAddNode(def.type)}
            style={({ pressed }) => [styles.nodeRow, pressed && styles.nodeRowPressed]}
          >
            <View style={[styles.nodeIcon, { backgroundColor: def.color + '20' }]}>
              <MaterialCommunityIcons name={def.icon as any} size={18} color={def.color} />
            </View>
            <View style={styles.nodeInfo}>
              <Text style={styles.nodeLabel}>{def.label}</Text>
              <Text style={styles.nodeDesc} numberOfLines={1}>{def.description}</Text>
            </View>
            <View style={[styles.catTag, { backgroundColor: CATEGORY_COLORS[def.category] + '20' }]}>
              <Text style={[styles.catTagText, { color: CATEGORY_COLORS[def.category] }]}>
                {def.category}
              </Text>
            </View>
          </Pressable>
        ))}
        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>لا نتائج لـ "{search}"</Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>{filtered.length} عقدة</Text>
        <Text style={styles.footerDot}>·</Text>
        <Text style={styles.footerText}>{NODE_DEFINITIONS.length} إجمالي</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', flex: 1 },
  closeBtn: { padding: Spacing.xs },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.bg, borderRadius: Radius.md, margin: Spacing.md,
    paddingHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.sm, paddingVertical: Spacing.sm },
  catScroll: { maxHeight: 34, marginBottom: Spacing.xs },
  catScrollContent: { alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderRadius: Radius.full, backgroundColor: Colors.surface2,
    borderWidth: 1, borderColor: Colors.border,
  },
  catLabel: { color: Colors.textDim, fontSize: 10, fontWeight: '600' },
  list: { flex: 1 },
  nodeRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border + '40',
  },
  nodeRowPressed: { backgroundColor: Colors.surface2 },
  nodeIcon: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  nodeInfo: { flex: 1 },
  nodeLabel: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  nodeDesc: { color: Colors.textDim, fontSize: FontSize.xs, marginTop: 1 },
  catTag: { paddingHorizontal: Spacing.xs, paddingVertical: 2, borderRadius: Radius.sm },
  catTagText: { fontSize: 9, fontWeight: '700' },
  empty: { padding: Spacing.xl, alignItems: 'center' },
  emptyText: { color: Colors.textDim, fontSize: FontSize.sm },
  footer: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.surface2,
  },
  footerText: { color: Colors.textDim, fontSize: FontSize.xs },
  footerDot: { color: Colors.textDim, fontSize: FontSize.xs },
});
