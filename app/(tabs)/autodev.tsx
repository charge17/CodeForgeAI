import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput, ScrollView,
  Animated, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useApp';
import { Image } from 'expo-image';

const EXAMPLE_IDEAS = [
  { icon: 'weather-partly-cloudy', label: 'تطبيق طقس', prompt: 'تطبيق طقس بـ React يعرض درجة الحرارة والرياح والرطوبة لأي مدينة باستخدام OpenWeatherMap API', color: '#4F8EF7' },
  { icon: 'cart-outline', label: 'متجر إلكتروني', prompt: 'متجر إلكتروني بـ Next.js مع سلة تسوق وصفحات المنتجات والدفع الإلكتروني', color: '#00C896' },
  { icon: 'chat-outline', label: 'تطبيق دردشة', prompt: 'تطبيق دردشة فورية بـ React وFirebase مع غرف متعددة وإشعارات', color: '#FF6B35' },
  { icon: 'view-dashboard-outline', label: 'لوحة تحكم', prompt: 'لوحة تحكم إدارية بـ React مع رسوم بيانية وإحصائيات وجداول بيانات', color: '#7C4DFF' },
  { icon: 'notebook-outline', label: 'تطبيق مهام', prompt: 'تطبيق إدارة مهام بـ Vue.js مع خزن محلي وفئات وتصفية حسب الحالة', color: '#FFB547' },
  { icon: 'api', label: 'REST API', prompt: 'خادم REST API بـ Express.js مع نقاط CRUD كاملة ومصادقة JWT وتوثيق Swagger', color: '#E040FB' },
];

const AI_MODELS = [
  { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com', icon: 'brain', color: '#4080FF' },
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com', icon: 'robot', color: '#10A37F' },
  { id: 'claude', name: 'Claude', url: 'https://claude.ai', icon: 'lightning-bolt', color: '#D97757' },
  { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com', icon: 'google', color: '#4285F4' },
];

export default function AutoDevScreen() {
  const insets = useSafeAreaInsets();
  const {
    startPipeline, stopPipeline, isPipelineRunning,
    pipelineLogs, graphNodes,
    projectIdea, setProjectIdea, selectedModelUrl, setSelectedModelUrl,
  } = useApp();

  const [selectedModel, setSelectedModel] = useState('deepseek');
  const [showLogs, setShowLogs] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

  const model = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0];

  const startPulse = () => {
    pulseRef.current?.stop();
    pulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    pulseRef.current.start();
  };

  const stopPulse = () => {
    pulseRef.current?.stop();
    pulseAnim.setValue(1);
  };

  const handleLaunch = () => {
    if (!projectIdea.trim()) return;
    setSelectedModelUrl(model.url);
    startPulse();
    setShowLogs(true);
    startPipeline(projectIdea, model.url);
  };

  const handleStop = () => {
    stopPipeline();
    stopPulse();
  };

  const logColor = (type: string) => {
    if (type === 'success') return Colors.success;
    if (type === 'error') return Colors.error;
    if (type === 'warn') return Colors.warning;
    if (type === 'running') return Colors.running;
    return Colors.textMuted;
  };

  const completedNodes = graphNodes.filter(n => n.status === 'completed').length;
  const totalNodes = graphNodes.length;
  const progress = totalNodes > 0 ? completedNodes / totalNodes : 0;
  const currentNode = graphNodes.find(n => n.status === 'running');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Image source={require('@/assets/images/logo.png')} style={styles.logo} contentFit="contain" />
        <View>
          <Text style={styles.headerTitle}>Auto Dev</Text>
          <Text style={styles.headerSub}>بناء المشاريع تلقائياً بـ AI</Text>
        </View>
        <View style={{ flex: 1 }} />
        {isPipelineRunning && (
          <View style={styles.runningBadge}>
            <Animated.View style={[styles.runDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.runBadgeText}>يعمل</Text>
          </View>
        )}
        <Pressable onPress={() => setShowLogs(v => !v)}
          style={[styles.iconBtn, showLogs && styles.iconBtnActive]}>
          <MaterialCommunityIcons name="console" size={16} color={showLogs ? Colors.primary : Colors.textMuted} />
        </Pressable>
      </View>

      {/* Progress bar when running */}
      {isPipelineRunning && (
        <View style={styles.progressWrap}>
          <Animated.View style={[styles.progressBar, {
            width: `${Math.max(2, progress * 100)}%` as any,
          }]} />
          <Text style={styles.progressText} numberOfLines={1}>
            {completedNodes}/{totalNodes} {currentNode ? `← ${currentNode.label || currentNode.type}` : 'عقدة'}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Live Logs */}
        {showLogs && pipelineLogs.length > 0 && (
          <View style={styles.logsCard}>
            <View style={styles.logsHeader}>
              <MaterialCommunityIcons name="console" size={13} color={Colors.primary} />
              <Text style={styles.logsTitle}>سجل Pipeline الحي</Text>
              <Text style={styles.logsCount}>{pipelineLogs.length}</Text>
            </View>
            <ScrollView style={styles.logsList} showsVerticalScrollIndicator={false}>
              {pipelineLogs.slice(-25).map((log, i) => (
                <View key={log.id} style={styles.logRow}>
                  <Text style={[styles.logIcon, { color: logColor(log.type) }]}>
                    {log.type === 'success' ? '✓' : log.type === 'error' ? '✗' : log.type === 'running' ? '▶' : log.type === 'warn' ? '⚠' : '·'}
                  </Text>
                  <Text style={styles.logTime}>{log.timestamp}</Text>
                  <Text style={[styles.logMsg, { color: logColor(log.type) }]} numberOfLines={2}>{log.message}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Project idea */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>💡 فكرة المشروع</Text>
          <View style={[styles.ideaBox, isPipelineRunning && styles.ideaBoxRunning]}>
            <TextInput
              value={projectIdea}
              onChangeText={setProjectIdea}
              placeholder="اكتب وصفاً لمشروعك... مثال: تطبيق طقس بـ React"
              placeholderTextColor={Colors.textDim}
              style={styles.ideaInput}
              multiline numberOfLines={4}
              textAlignVertical="top"
              editable={!isPipelineRunning}
            />
            <View style={styles.ideaFooter}>
              <Text style={styles.charCount}>{projectIdea.length} حرف</Text>
              {projectIdea.length > 0 && !isPipelineRunning && (
                <Pressable onPress={() => setProjectIdea('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialCommunityIcons name="close-circle" size={16} color={Colors.textDim} />
                </Pressable>
              )}
            </View>
          </View>

          {!isPipelineRunning && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.examplesRow}>
              {EXAMPLE_IDEAS.map(e => (
                <Pressable key={e.label} onPress={() => setProjectIdea(e.prompt)}
                  style={[styles.exampleChip, { borderColor: e.color + '50' }]}>
                  <MaterialCommunityIcons name={e.icon as any} size={13} color={e.color} />
                  <Text style={[styles.exampleLabel, { color: e.color }]}>{e.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* AI Model */}
        {!isPipelineRunning && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>🤖 نموذج AI</Text>
            <View style={styles.modelsRow}>
              {AI_MODELS.map(m => (
                <Pressable key={m.id} onPress={() => setSelectedModel(m.id)}
                  style={[styles.modelCard, selectedModel === m.id && { borderColor: m.color, backgroundColor: m.color + '12' }]}>
                  <View style={[styles.modelIcon, { backgroundColor: m.color + '20' }]}>
                    <MaterialCommunityIcons name={m.icon as any} size={20} color={m.color} />
                  </View>
                  <Text style={[styles.modelName, selectedModel === m.id && { color: m.color }]}>{m.name}</Text>
                  {selectedModel === m.id && (
                    <View style={[styles.modelCheck, { backgroundColor: m.color }]}>
                      <MaterialCommunityIcons name="check" size={10} color="#fff" />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
            <View style={styles.modelUrl}>
              <MaterialCommunityIcons name="link" size={12} color={Colors.textDim} />
              <Text style={styles.modelUrlText}>{model.url}</Text>
            </View>
          </View>
        )}

        {/* Pipeline preview */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>⚙️ Pipeline ({totalNodes} عقدة)</Text>
          <View style={styles.pipelinePreview}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pipelineSteps}>
              {graphNodes.slice(0, 10).map((node, i) => {
                const color = node.status === 'completed' ? Colors.success
                  : node.status === 'running' ? Colors.running
                  : node.status === 'failed' ? Colors.error
                  : Colors.border;
                return (
                  <View key={node.id} style={styles.pipelineStepWrap}>
                    <View style={[styles.pipelineStep, { borderColor: color, backgroundColor: color + '15' }]}>
                      {node.status === 'completed'
                        ? <MaterialCommunityIcons name="check" size={11} color={Colors.success} />
                        : node.status === 'running'
                          ? <MaterialCommunityIcons name="cog" size={11} color={Colors.running} />
                          : <Text style={[styles.pipelineStepNum, { color }]}>{i + 1}</Text>}
                    </View>
                    {i < Math.min(9, graphNodes.length - 1) && (
                      <View style={[styles.pipelineArrow, { backgroundColor: color }]} />
                    )}
                    <Text style={[styles.pipelineStepLabel, node.status === 'running' && { color: Colors.running }]} numberOfLines={1}>
                      {(node.label || node.type).substring(0, 9)}
                    </Text>
                  </View>
                );
              })}
              {totalNodes > 10 && <Text style={styles.pipelineMore}>+{totalNodes - 10}</Text>}
            </ScrollView>
          </View>
        </View>

        {/* How it works */}
        {!isPipelineRunning && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>📖 كيف يعمل؟</Text>
            <View style={styles.stepsCard}>
              {[
                { icon: 'rocket-launch', color: Colors.primary, label: '1. إطلاق Pipeline', desc: 'يُفعَّل سير العمل ويبدأ التنفيذ التلقائي' },
                { icon: 'web', color: '#4F8EF7', label: '2. المتصفح الذكي', desc: 'يفتح DeepSeek ويحقن برومبت التخطيط تلقائياً' },
                { icon: 'code-json', color: Colors.success, label: '3. استخراج المهام', desc: 'يستخرج JSON المهام ويرسلها لشاشة Tasks' },
                { icon: 'refresh', color: '#FF7043', label: '4. حلقة البرمجة', desc: 'لكل مهمة: يبرمج → ينتظر → يستخرج الملفات' },
                { icon: 'folder-open', color: Colors.warning, label: '5. Workspace', desc: 'الملفات المنشأة تظهر فوراً في محرر الأكواد' },
              ].map(step => (
                <View key={step.label} style={styles.stepRow}>
                  <View style={[styles.stepIcon, { backgroundColor: step.color + '20' }]}>
                    <MaterialCommunityIcons name={step.icon as any} size={16} color={step.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stepLabel}>{step.label}</Text>
                    <Text style={styles.stepDesc}>{step.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Launch / Stop button */}
      <View style={[styles.launchWrap, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        {isPipelineRunning ? (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Pressable onPress={handleStop} style={styles.stopBtn}>
              <MaterialCommunityIcons name="stop-circle" size={22} color="#fff" />
              <Text style={styles.btnText}>إيقاف Pipeline</Text>
              <View style={styles.stopDot} />
            </Pressable>
          </Animated.View>
        ) : (
          <Pressable
            onPress={handleLaunch}
            disabled={!projectIdea.trim()}
            style={({ pressed }) => [
              styles.launchBtn,
              !projectIdea.trim() && styles.launchBtnDisabled,
              pressed && { opacity: 0.88 },
            ]}
          >
            <MaterialCommunityIcons name="rocket-launch" size={22} color="#fff" />
            <Text style={styles.btnText}>إطلاق Pipeline التلقائي</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  logo: { width: 32, height: 32, borderRadius: Radius.sm },
  headerTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '800' },
  headerSub: { color: Colors.textDim, fontSize: FontSize.xs },
  runningBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.running + '22', borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 4,
  },
  runDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.running },
  runBadgeText: { color: Colors.running, fontSize: FontSize.xs, fontWeight: '700' },
  iconBtn: { padding: Spacing.sm, borderRadius: Radius.sm, backgroundColor: Colors.surface2 },
  iconBtnActive: { backgroundColor: Colors.primaryDim },

  progressWrap: {
    height: 30, backgroundColor: Colors.surface2, overflow: 'hidden',
    borderBottomWidth: 1, borderBottomColor: Colors.border, justifyContent: 'center',
    position: 'relative',
  },
  progressBar: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    backgroundColor: Colors.primary + '35',
  },
  progressText: {
    color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700',
    paddingHorizontal: Spacing.lg, zIndex: 1,
  },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.xl },

  logsCard: {
    backgroundColor: Colors.bg, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.primary + '40', overflow: 'hidden',
  },
  logsHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    padding: Spacing.sm, paddingHorizontal: Spacing.md,
    backgroundColor: Colors.primaryDim, borderBottomWidth: 1, borderBottomColor: Colors.primary + '30',
  },
  logsTitle: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700', flex: 1 },
  logsCount: {
    color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700',
    backgroundColor: Colors.primary + '30', borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
  },
  logsList: { maxHeight: 220, padding: Spacing.sm },
  logRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, marginBottom: 4 },
  logIcon: { fontSize: FontSize.xs, fontWeight: '700', width: 12, textAlign: 'center', marginTop: 1 },
  logTime: {
    color: Colors.textDim, fontSize: 9, minWidth: 58,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  logMsg: {
    fontSize: FontSize.xs, flex: 1, lineHeight: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  section: { gap: Spacing.md },
  sectionLabel: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '700', letterSpacing: 0.3 },

  ideaBox: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.border, overflow: 'hidden',
  },
  ideaBoxRunning: { borderColor: Colors.running + '60' },
  ideaInput: {
    color: Colors.text, fontSize: FontSize.md, lineHeight: 24,
    padding: Spacing.lg, minHeight: 100,
  },
  ideaFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.border + '50',
  },
  charCount: { color: Colors.textDim, fontSize: FontSize.xs },
  examplesRow: { gap: Spacing.sm, paddingVertical: 2 },
  exampleChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.full, borderWidth: 1,
  },
  exampleLabel: { fontSize: FontSize.xs, fontWeight: '600' },

  modelsRow: { flexDirection: 'row', gap: Spacing.sm },
  modelCard: {
    flex: 1, alignItems: 'center', gap: Spacing.xs, padding: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.border, position: 'relative',
  },
  modelIcon: { width: 38, height: 38, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  modelName: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' },
  modelCheck: {
    position: 'absolute', top: -4, right: -4, width: 16, height: 16,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.bg,
  },
  modelUrl: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.surface2, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
  },
  modelUrlText: {
    color: Colors.textDim, fontSize: FontSize.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  pipelinePreview: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.md,
  },
  pipelineSteps: { alignItems: 'center', gap: 0, paddingVertical: 4 },
  pipelineStepWrap: { alignItems: 'center', gap: 4 },
  pipelineStep: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  pipelineStepNum: { fontSize: 10, fontWeight: '700' },
  pipelineArrow: { width: 14, height: 1.5, marginHorizontal: 2, alignSelf: 'center' },
  pipelineStepLabel: { fontSize: 8, maxWidth: 38, textAlign: 'center', color: Colors.textDim },
  pipelineMore: { color: Colors.textDim, fontSize: FontSize.xs, paddingLeft: Spacing.sm, alignSelf: 'center' },

  stepsCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  stepRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border + '40',
  },
  stepIcon: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700' },
  stepDesc: { color: Colors.textDim, fontSize: FontSize.xs, marginTop: 2 },

  launchWrap: {
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  launchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md,
    backgroundColor: Colors.primary, borderRadius: Radius.xl, paddingVertical: Spacing.lg,
  },
  launchBtnDisabled: { opacity: 0.35 },
  stopBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md,
    backgroundColor: Colors.error, borderRadius: Radius.xl, paddingVertical: Spacing.lg,
  },
  stopDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff', opacity: 0.7 },
  btnText: { color: '#fff', fontSize: FontSize.xl, fontWeight: '800' },
});
