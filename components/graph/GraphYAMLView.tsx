import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { NODE_DEFINITIONS, GraphNode, GraphEdge } from '@/services/mockData';

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onClose: () => void;
  insets: { top: number; bottom: number };
}

function buildYAML(nodes: GraphNode[], edges: GraphEdge[]): string {
  const lines: string[] = ['workflow:', '  version: "1.0"', '  nodes:'];
  nodes.forEach(node => {
    const def = NODE_DEFINITIONS.find(d => d.type === node.type);
    lines.push(`    - id: ${node.id}`);
    lines.push(`      type: ${node.type}`);
    lines.push(`      label: "${def?.label || node.type}"`);
    lines.push(`      position: { x: ${Math.round(node.x || 0)}, y: ${Math.round(node.y || 0)} }`);
    if (node.config && Object.keys(node.config).length > 0) {
      lines.push('      config:');
      Object.entries(node.config).forEach(([k, v]) => {
        lines.push(`        ${k}: "${v}"`);
      });
    }
  });
  lines.push('  edges:');
  edges.forEach(edge => {
    lines.push(`    - id: ${edge.id}`);
    lines.push(`      from: ${edge.from}`);
    lines.push(`      to: ${edge.to}`);
    if (edge.label) lines.push(`      label: "${edge.label}"`);
  });
  return lines.join('\n');
}

export default function GraphYAMLView({ nodes, edges, onClose, insets }: Props) {
  const yaml = buildYAML(nodes, edges);
  const [content, setContent] = useState(yaml);
  const [activeFormat, setActiveFormat] = useState<'yaml' | 'json'>('yaml');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async () => {
    try {
      await Share.share({ message: displayContent, title: 'Graph Workflow' });
    } catch {
      // ignore share dismiss
    }
  };

  const lineCount = content.split('\n').length;

  const jsonContent = JSON.stringify({
    workflow: {
      version: '1.0',
      nodes: nodes.map(n => ({ id: n.id, type: n.type, label: n.label, position: { x: n.x || 0, y: n.y || 0 }, config: n.config })),
      edges: edges.map(e => ({ id: e.id, from: e.from, to: e.to, label: e.label })),
    }
  }, null, 2);

  const displayContent = activeFormat === 'yaml' ? content : jsonContent;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={Colors.textMuted} />
        </Pressable>
        <MaterialCommunityIcons name="code-json" size={18} color={Colors.primary} />
        <Text style={styles.title}>عرض الكود</Text>

        <View style={styles.formatToggle}>
          {(['yaml', 'json'] as const).map(f => (
            <Pressable
              key={f}
              onPress={() => setActiveFormat(f)}
              style={[styles.fmtBtn, activeFormat === f && styles.fmtBtnActive]}
            >
              <Text style={[styles.fmtLabel, activeFormat === f && styles.fmtLabelActive]}>
                {f.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ flex: 1 }} />

        <Pressable onPress={handleCopy} style={styles.copyBtn}>
          <MaterialCommunityIcons name={copied ? 'check' : 'content-copy'} size={16} color={copied ? Colors.success : Colors.primary} />
          <Text style={[styles.copyLabel, { color: copied ? Colors.success : Colors.primary }]}>
            {copied ? 'تم النسخ' : 'نسخ'}
          </Text>
        </Pressable>

        <Pressable style={styles.exportBtn}>
          <MaterialCommunityIcons name="export" size={16} color={Colors.textMuted} />
          <Text style={styles.exportLabel}>تصدير</Text>
        </Pressable>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'عقد', value: nodes.length, icon: 'circle-small' },
          { label: 'اتصالات', value: edges.length, icon: 'vector-line' },
          { label: 'سطر', value: lineCount, icon: 'format-list-numbered' },
        ].map(s => (
          <View key={s.label} style={styles.stat}>
            <Text style={styles.statVal}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Editor */}
      <View style={styles.editorWrap}>
        <ScrollView style={styles.lineNumbers} showsVerticalScrollIndicator={false} scrollEnabled={false}>
          {displayContent.split('\n').map((_, i) => (
            <Text key={i} style={styles.lineNum}>{i + 1}</Text>
          ))}
        </ScrollView>
        <ScrollView style={styles.codeScroll}>
          <TextInput
            multiline
            value={displayContent}
            onChangeText={activeFormat === 'yaml' ? setContent : undefined}
            style={styles.codeEditor}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            scrollEnabled={false}
            editable={activeFormat === 'yaml'}
          />
        </ScrollView>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {activeFormat === 'yaml' ? 'YAML — قابل للتعديل' : 'JSON — للقراءة فقط'}
        </Text>
        <Pressable style={styles.applyBtn}>
          <MaterialCommunityIcons name="check-circle" size={16} color={Colors.success} />
          <Text style={styles.applyLabel}>تطبيق التغييرات على Canvas</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: Spacing.xs },
  title: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  formatToggle: {
    flexDirection: 'row', backgroundColor: Colors.surface2,
    borderRadius: Radius.sm, padding: 2, marginLeft: Spacing.sm,
  },
  fmtBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.sm - 2 },
  fmtBtnActive: { backgroundColor: Colors.primaryDim },
  fmtLabel: { color: Colors.textDim, fontSize: FontSize.xs, fontWeight: '700' },
  fmtLabelActive: { color: Colors.primary },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.primaryDim, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
  },
  copyLabel: { fontSize: FontSize.sm, fontWeight: '600' },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.surface2, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    borderWidth: 1, borderColor: Colors.border,
  },
  exportLabel: { color: Colors.textMuted, fontSize: FontSize.sm },
  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.surface2,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  stat: {
    flex: 1, alignItems: 'center', paddingVertical: Spacing.sm,
    borderRightWidth: 1, borderRightColor: Colors.border,
  },
  statVal: { color: Colors.primary, fontSize: FontSize.lg, fontWeight: '700' },
  statLabel: { color: Colors.textDim, fontSize: FontSize.xs, marginTop: 2 },
  editorWrap: { flex: 1, flexDirection: 'row' },
  lineNumbers: { width: 44, backgroundColor: Colors.surface, paddingTop: Spacing.md },
  lineNum: {
    color: Colors.textDim, fontSize: FontSize.xs, textAlign: 'right',
    paddingRight: Spacing.sm, lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  codeScroll: { flex: 1 },
  codeEditor: {
    color: Colors.text, fontSize: FontSize.sm,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 20, padding: Spacing.md, textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md, paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  footerText: { color: Colors.textDim, fontSize: FontSize.xs },
  applyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.successDim, borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderWidth: 1, borderColor: Colors.success + '50',
  },
  applyLabel: { color: Colors.success, fontSize: FontSize.sm, fontWeight: '600' },
});
