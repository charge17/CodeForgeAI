import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { GraphNode, NODE_DEFINITIONS } from '@/services/mockData';

interface Props {
  node: GraphNode;
  onClose: () => void;
  onDelete?: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  idle: { label: 'جاهز', color: Colors.textDim },
  running: { label: 'يعمل', color: Colors.running },
  completed: { label: 'مكتمل', color: Colors.completed },
  failed: { label: 'فشل', color: Colors.error },
  paused: { label: 'متوقف', color: Colors.warning },
};

const FIELD_HINTS: Record<string, string> = {
  model: 'GPT-4 / Claude-3 / Gemini-2',
  prompt: 'نص الموجه للنموذج',
  url: 'https://example.com',
  selector: '#element-id أو .class-name',
  delay: '1000 (بالمللي ثانية)',
  timeout: '30000 (بالمللي ثانية)',
  path: '/src/components/MyFile.jsx',
  content: 'محتوى الملف أو المتغير',
};

export default function NodeInspector({ node, onClose, onDelete }: Props) {
  const def = NODE_DEFINITIONS.find(d => d.type === node.type);
  if (!def) return null;

  const statusInfo = STATUS_LABELS[node.status || 'idle'];
  const [config, setConfig] = useState<Record<string, string>>(node.config || {});
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const [showAddField, setShowAddField] = useState(false);

  const handleAddField = () => {
    if (!newKey.trim()) return;
    setConfig(prev => ({ ...prev, [newKey.trim()]: newVal }));
    setNewKey('');
    setNewVal('');
    setShowAddField(false);
  };

  const handleRemoveField = (key: string) => {
    setConfig(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const suggestedFields: string[] = [];
  if (node.type === 'ai_model') suggestedFields.push('model', 'prompt', 'temperature');
  if (node.type === 'ai_webview') suggestedFields.push('url', 'selector', 'prompt');
  if (node.type === 'navigate' || node.type === 'go_browser') suggestedFields.push('url');
  if (node.type === 'click') suggestedFields.push('selector');
  if (node.type === 'type_text') suggestedFields.push('selector', 'content');
  if (node.type === 'wait') suggestedFields.push('delay');
  if (node.type === 'wait_selector') suggestedFields.push('selector', 'timeout');
  if (node.type === 'create_file' || node.type === 'update_file') suggestedFields.push('path', 'content');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconBig, { backgroundColor: def.color + '20' }]}>
          <MaterialCommunityIcons name={def.icon as any} size={22} color={def.color} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{def.label}</Text>
          <Text style={[styles.status, { color: statusInfo.color }]}>
            ● {statusInfo.label}
          </Text>
        </View>
        <View style={styles.headerBtns}>
          {onDelete && (
            <Pressable onPress={onDelete} style={[styles.iconBtn, { backgroundColor: Colors.errorDim }]}>
              <MaterialCommunityIcons name="trash-can-outline" size={16} color={Colors.error} />
            </Pressable>
          )}
          <Pressable onPress={onClose} style={styles.iconBtn}>
            <MaterialCommunityIcons name="close" size={18} color={Colors.textMuted} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>الوصف</Text>
          <Text style={styles.desc}>{def.description}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.catBadge, { borderColor: def.color + '60' }]}>
              <MaterialCommunityIcons name={def.icon as any} size={12} color={def.color} />
              <Text style={[styles.catText, { color: def.color }]}>{def.category}</Text>
            </View>
            <View style={styles.idBox}>
              <Text style={styles.idText}>{node.id}</Text>
            </View>
          </View>
        </View>

        {/* Config fields */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>الإعدادات</Text>
            <Pressable onPress={() => setShowAddField(v => !v)} style={styles.addFieldBtn}>
              <MaterialCommunityIcons name="plus" size={14} color={Colors.primary} />
              <Text style={styles.addFieldText}>إضافة</Text>
            </Pressable>
          </View>

          {Object.keys(config).length === 0 && !showAddField && (
            <Text style={styles.emptyConfig}>لا توجد إعدادات — اضغط + لإضافة</Text>
          )}

          {Object.entries(config).map(([k, v]) => (
            <View key={k} style={styles.configRow}>
              <Text style={styles.configKey}>{k}</Text>
              <TextInput
                style={styles.configVal}
                value={v}
                onChangeText={val => setConfig(prev => ({ ...prev, [k]: val }))}
                placeholder={FIELD_HINTS[k] || '...'}
                placeholderTextColor={Colors.textDim}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable onPress={() => handleRemoveField(k)} style={styles.removeFieldBtn}>
                <MaterialCommunityIcons name="close" size={12} color={Colors.textDim} />
              </Pressable>
            </View>
          ))}

          {showAddField && (
            <View style={styles.addFieldWrap}>
              <TextInput
                value={newKey}
                onChangeText={setNewKey}
                placeholder="المفتاح (key)"
                placeholderTextColor={Colors.textDim}
                style={styles.addKeyInput}
                autoCapitalize="none"
              />
              <TextInput
                value={newVal}
                onChangeText={setNewVal}
                placeholder="القيمة..."
                placeholderTextColor={Colors.textDim}
                style={styles.addValInput}
                autoCapitalize="none"
              />
              <Pressable onPress={handleAddField} style={styles.confirmAddBtn}>
                <MaterialCommunityIcons name="check" size={16} color={Colors.success} />
              </Pressable>
            </View>
          )}

          {/* Suggested fields */}
          {suggestedFields.length > 0 && (
            <View style={styles.suggestedWrap}>
              <Text style={styles.suggestedLabel}>حقول مقترحة:</Text>
              <View style={styles.suggestedChips}>
                {suggestedFields.filter(f => !config[f]).map(f => (
                  <Pressable
                    key={f}
                    onPress={() => setConfig(prev => ({ ...prev, [f]: '' }))}
                    style={styles.suggestedChip}
                  >
                    <Text style={styles.suggestedChipText}>{f}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Execution log */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>سجل التنفيذ</Text>
          <View style={styles.logBox}>
            {node.status === 'completed' && (
              <Text style={[styles.logLine, { color: Colors.completed }]}>✓ تم التنفيذ بنجاح</Text>
            )}
            {node.status === 'running' && (
              <Text style={[styles.logLine, { color: Colors.running }]}>⟳ جاري التنفيذ...</Text>
            )}
            {node.status === 'failed' && (
              <>
                <Text style={[styles.logLine, { color: Colors.error }]}>✗ فشل التنفيذ</Text>
                <Pressable style={styles.fixBtn}>
                  <MaterialCommunityIcons name="wrench" size={14} color={Colors.warning} />
                  <Text style={styles.fixText}>🔧 أصلح تلقائياً بالـ AI</Text>
                </Pressable>
              </>
            )}
            {(node.status === 'idle' || !node.status) && (
              <Text style={[styles.logLine, { color: Colors.textDim }]}>— في انتظار التشغيل</Text>
            )}
          </View>
        </View>

        {/* Suggest next node */}
        <View style={[styles.section, { marginBottom: Spacing.xxl }]}>
          <Text style={styles.sectionTitle}>العقدة التالية المقترحة ✨</Text>
          <View style={styles.suggestNextRow}>
            {(() => {
              const nextMap: Record<string, string[]> = {
                ai_model: ['extract_files', 'create_tasks', 'condition'],
                go_browser: ['navigate', 'ai_webview', 'click'],
                ai_webview: ['wait_ai', 'extract_text', 'take_screenshot'],
                wait_ai: ['extract_files', 'extract_text'],
                extract_files: ['complete_task', 'go_workspace'],
                run_tests: ['condition', 'deploy'],
                condition: ['deploy', 'smart_retry', 'ask_human'],
                loop: ['go_browser', 'ai_model'],
              };
              const suggestions = nextMap[node.type] || ['log', 'delay', 'condition'];
              return suggestions.map(type => {
                const d = NODE_DEFINITIONS.find(d => d.type === type);
                if (!d) return null;
                return (
                  <View key={type} style={[styles.nextNodeChip, { borderColor: d.color + '50' }]}>
                    <MaterialCommunityIcons name={d.icon as any} size={14} color={d.color} />
                    <Text style={styles.nextNodeLabel}>{d.label}</Text>
                  </View>
                );
              });
            })()}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface, borderLeftWidth: 1, borderLeftColor: Colors.border },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  iconBig: { width: 42, height: 42, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  name: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  status: { fontSize: FontSize.sm, marginTop: 2 },
  headerBtns: { flexDirection: 'row', gap: Spacing.xs },
  iconBtn: { padding: Spacing.xs, backgroundColor: Colors.surface2, borderRadius: Radius.sm },
  body: { flex: 1 },
  section: { padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border + '40' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  sectionTitle: {
    color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8, flex: 1,
  },
  desc: { color: Colors.text, fontSize: FontSize.md, lineHeight: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderRadius: Radius.full, borderWidth: 1, backgroundColor: Colors.surface2,
  },
  catText: { fontSize: FontSize.xs, fontWeight: '600' },
  idBox: { backgroundColor: Colors.bg, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderWidth: 1, borderColor: Colors.border },
  idText: { color: Colors.primary, fontSize: FontSize.xs, fontFamily: 'monospace' },
  addFieldBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.primaryDim, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
  },
  addFieldText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600' },
  emptyConfig: { color: Colors.textDim, fontSize: FontSize.xs, fontStyle: 'italic' },
  configRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
  configKey: { color: Colors.textMuted, fontSize: FontSize.xs, width: 72, fontFamily: 'monospace' },
  configVal: {
    flex: 1, backgroundColor: Colors.bg, borderRadius: Radius.sm,
    padding: Spacing.xs, color: Colors.text, fontSize: FontSize.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  removeFieldBtn: { padding: 4 },
  addFieldWrap: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs },
  addKeyInput: {
    width: 80, backgroundColor: Colors.bg, borderRadius: Radius.sm,
    padding: Spacing.xs, color: Colors.text, fontSize: FontSize.xs,
    borderWidth: 1, borderColor: Colors.border,
  },
  addValInput: {
    flex: 1, backgroundColor: Colors.bg, borderRadius: Radius.sm,
    padding: Spacing.xs, color: Colors.text, fontSize: FontSize.xs,
    borderWidth: 1, borderColor: Colors.border,
  },
  confirmAddBtn: { padding: Spacing.xs, backgroundColor: Colors.successDim, borderRadius: Radius.sm },
  suggestedWrap: { marginTop: Spacing.md },
  suggestedLabel: { color: Colors.textDim, fontSize: FontSize.xs, marginBottom: Spacing.xs },
  suggestedChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  suggestedChip: {
    paddingHorizontal: Spacing.sm, paddingVertical: 3, backgroundColor: Colors.surface2,
    borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border,
  },
  suggestedChipText: { color: Colors.textMuted, fontSize: FontSize.xs },
  logBox: {
    backgroundColor: Colors.bg, borderRadius: Radius.sm, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, minHeight: 52, gap: Spacing.xs,
  },
  logLine: { fontSize: FontSize.sm, fontFamily: 'monospace' },
  fixBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.warningDim, borderRadius: Radius.sm,
    padding: Spacing.sm, borderWidth: 1, borderColor: Colors.warning + '40',
  },
  fixText: { color: Colors.warning, fontSize: FontSize.xs, fontWeight: '600' },
  suggestNextRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  nextNodeChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.surface2, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderWidth: 1,
  },
  nextNodeLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
});
