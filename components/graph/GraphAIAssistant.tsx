import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { NODE_DEFINITIONS } from '@/services/mockData';

interface Props {
  onAddNode: (type: string) => void;
  onClose: () => void;
}

const TEMPLATES = [
  {
    id: 'tpl1', label: 'تطبيق React Native',
    icon: 'react', color: '#61DAFB',
    nodes: ['trigger', 'ai_model', 'create_tasks', 'loop', 'go_browser', 'ai_webview', 'wait_ai', 'extract_files', 'complete_task', 'run_tests', 'deploy'],
    description: 'بناء تطبيق موبايل كامل مع Firebase',
  },
  {
    id: 'tpl2', label: 'مقارن نماذج AI',
    icon: 'compare', color: '#E040FB',
    nodes: ['trigger', 'ai_comparator', 'condition', 'log'],
    description: 'مقارنة مخرجات Claude مع Gemini',
  },
  {
    id: 'tpl3', label: 'سكرابر ويب',
    icon: 'spider-web', color: '#26C6DA',
    nodes: ['trigger', 'go_browser', 'web_scraper', 'create_file', 'gen_docs'],
    description: 'جمع بيانات منظمة من موقع',
  },
  {
    id: 'tpl4', label: 'Deploy Pipeline',
    icon: 'rocket-launch', color: '#7C4DFF',
    nodes: ['trigger', 'run_tests', 'condition', 'ask_human', 'deploy', 'send_notification'],
    description: 'اختبار ونشر تلقائي مع موافقة بشرية',
  },
];

const SUGGESTIONS = [
  { prompt: 'تطبيق React Native مع Firebase', nodes: ['trigger', 'ai_model', 'create_tasks', 'go_browser', 'ai_webview', 'extract_files', 'deploy'] },
  { prompt: 'API REST بـ Express', nodes: ['trigger', 'ai_model', 'create_file', 'run_tests', 'deploy'] },
  { prompt: 'سكرابر بيانات ذكي', nodes: ['trigger', 'go_browser', 'web_scraper', 'ai_model', 'create_file'] },
];

export default function GraphAIAssistant({ onAddNode, onClose }: Props) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<string[] | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'templates'>('chat');

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setGenerated(null);

    // Simulate AI graph generation
    setTimeout(() => {
      const matched = SUGGESTIONS.find(s =>
        s.prompt.toLowerCase().split(' ').some(w => prompt.includes(w))
      );
      const nodeTypes = matched?.nodes || ['trigger', 'ai_model', 'extract_files', 'create_file', 'deploy'];
      setGenerated(nodeTypes);
      setIsGenerating(false);
    }, 1800);
  };

  const handleAddGenerated = () => {
    if (!generated) return;
    generated.forEach(type => onAddNode(type));
    setGenerated(null);
    setPrompt('');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="auto-fix" size={18} color={Colors.primary} />
        <Text style={styles.headerTitle}>مساعد AI للـ Graph</Text>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <MaterialCommunityIcons name="close" size={18} color={Colors.textMuted} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {([
          { key: 'chat', label: 'محادثة', icon: 'chat' },
          { key: 'templates', label: 'قوالب', icon: 'view-grid' },
        ] as { key: 'chat' | 'templates'; label: string; icon: string }[]).map(t => (
          <Pressable
            key={t.key}
            onPress={() => setActiveTab(t.key)}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
          >
            <MaterialCommunityIcons name={t.icon as any} size={14} color={activeTab === t.key ? Colors.primary : Colors.textDim} />
            <Text style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {activeTab === 'chat' && (
          <>
            {/* Input */}
            <View style={styles.inputSection}>
              <Text style={styles.sectionLabel}>صف ما تريد بناءه:</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  value={prompt}
                  onChangeText={setPrompt}
                  placeholder="مثال: تطبيق طقس بـ React مع API..."
                  placeholderTextColor={Colors.textDim}
                  style={styles.input}
                  multiline
                  numberOfLines={3}
                />
              </View>
              <Pressable
                onPress={handleGenerate}
                style={[styles.generateBtn, (!prompt.trim() || isGenerating) && styles.generateBtnDisabled]}
                disabled={!prompt.trim() || isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialCommunityIcons name="auto-fix" size={16} color="#fff" />
                )}
                <Text style={styles.generateBtnText}>
                  {isGenerating ? 'يحلل ويرسم...' : 'رسم سير العمل تلقائياً'}
                </Text>
              </Pressable>
            </View>

            {/* Quick suggestions */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>اقتراحات سريعة:</Text>
              {SUGGESTIONS.map(s => (
                <Pressable
                  key={s.prompt}
                  onPress={() => setPrompt(s.prompt)}
                  style={styles.suggChip}
                >
                  <MaterialCommunityIcons name="lightning-bolt" size={12} color={Colors.warning} />
                  <Text style={styles.suggText}>{s.prompt}</Text>
                </Pressable>
              ))}
            </View>

            {/* Generated result */}
            {generated && (
              <View style={styles.resultBox}>
                <View style={styles.resultHeader}>
                  <MaterialCommunityIcons name="check-circle" size={16} color={Colors.success} />
                  <Text style={styles.resultTitle}>تم توليد {generated.length} عقدة</Text>
                </View>
                <View style={styles.generatedNodes}>
                  {generated.map((type, i) => {
                    const def = NODE_DEFINITIONS.find(d => d.type === type);
                    return (
                      <View key={i} style={[styles.genNode, { borderColor: def?.color + '60' }]}>
                        <MaterialCommunityIcons name={def?.icon as any || 'circle'} size={14} color={def?.color || Colors.textDim} />
                        <Text style={styles.genNodeLabel}>{def?.label || type}</Text>
                      </View>
                    );
                  })}
                </View>
                <Pressable onPress={handleAddGenerated} style={styles.addAllBtn}>
                  <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                  <Text style={styles.addAllText}>إضافة جميع العقد إلى Canvas</Text>
                </Pressable>
              </View>
            )}
          </>
        )}

        {activeTab === 'templates' && (
          <View style={styles.section}>
            {TEMPLATES.map(tpl => (
              <View key={tpl.id} style={styles.tplCard}>
                <View style={[styles.tplIcon, { backgroundColor: tpl.color + '20' }]}>
                  <MaterialCommunityIcons name={tpl.icon as any} size={20} color={tpl.color} />
                </View>
                <View style={styles.tplInfo}>
                  <Text style={styles.tplLabel}>{tpl.label}</Text>
                  <Text style={styles.tplDesc}>{tpl.description}</Text>
                  <Text style={styles.tplNodes}>{tpl.nodes.length} عقدة</Text>
                </View>
                <Pressable
                  onPress={() => tpl.nodes.forEach(type => onAddNode(type))}
                  style={styles.tplUseBtn}
                >
                  <MaterialCommunityIcons name="import" size={16} color={Colors.primary} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, paddingVertical: Spacing.sm, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabLabel: { color: Colors.textDim, fontSize: FontSize.xs },
  tabLabelActive: { color: Colors.primary, fontWeight: '600' },
  body: { flex: 1 },
  inputSection: { padding: Spacing.lg, gap: Spacing.md },
  section: { padding: Spacing.lg, gap: Spacing.sm },
  sectionLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600', marginBottom: Spacing.xs },
  inputWrap: {
    backgroundColor: Colors.bg, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.sm,
  },
  input: { color: Colors.text, fontSize: FontSize.sm, minHeight: 60, textAlignVertical: 'top' },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.md,
  },
  generateBtnDisabled: { opacity: 0.45 },
  generateBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  suggChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.surface2, borderRadius: Radius.sm,
    padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  suggText: { color: Colors.textMuted, fontSize: FontSize.sm },
  resultBox: {
    margin: Spacing.lg, backgroundColor: Colors.successDim,
    borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.success + '40',
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  resultTitle: { color: Colors.success, fontSize: FontSize.md, fontWeight: '700' },
  generatedNodes: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  genNode: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.surface, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    borderWidth: 1,
  },
  genNodeLabel: { color: Colors.textMuted, fontSize: FontSize.xs },
  addAllBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.success, borderRadius: Radius.md, padding: Spacing.md,
  },
  addAllText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },
  tplCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface2, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  tplIcon: { width: 42, height: 42, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  tplInfo: { flex: 1 },
  tplLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: '600' },
  tplDesc: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  tplNodes: { color: Colors.textDim, fontSize: FontSize.xs, marginTop: 3 },
  tplUseBtn: {
    width: 36, height: 36, borderRadius: Radius.md, backgroundColor: Colors.primaryDim,
    alignItems: 'center', justifyContent: 'center',
  },
});
