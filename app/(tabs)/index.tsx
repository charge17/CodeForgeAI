import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  TextInput, Modal, Platform, Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useApp';
import { NODE_DEFINITIONS, GraphNode, NodeType, NodeCategory } from '@/services/mockData';
import GraphYAMLView from '@/components/graph/GraphYAMLView';
import GraphAIAssistant from '@/components/graph/GraphAIAssistant';

const CAT_COLOR: Record<string, string> = {
  Trigger: '#00E5FF', AI: '#7C4DFF', Browser: '#4F8EF7',
  File: '#00C896', Task: '#FFB547', Logic: '#FF7043', Advanced: '#FF6B35',
};
const CAT_ICON: Record<string, string> = {
  Trigger: 'rocket-launch', AI: 'brain', Browser: 'web',
  File: 'folder-open', Task: 'checkbox-marked', Logic: 'source-branch', Advanced: 'lightning-bolt',
};
const LOOP_INNER = ['n10', 'n11', 'n12', 'n13', 'n14', 'n15', 'n16'];

// ── Pipeline Block ─────────────────────────────────────────────────
function PipelineBlock({
  node, index, isSelected, isInLoop, isLoopHeader, loopExpanded, pulseAnim, onPress, onToggleLoop,
}: {
  node: GraphNode; index: number; isSelected: boolean; isInLoop: boolean;
  isLoopHeader: boolean; loopExpanded: boolean; pulseAnim?: Animated.Value;
  onPress: () => void; onToggleLoop?: () => void;
}) {
  const def = NODE_DEFINITIONS.find(d => d.type === node.type);
  if (!def) return null;
  const catColor = CAT_COLOR[def.category] || Colors.textDim;
  const statusColor =
    node.status === 'running' ? Colors.running :
    node.status === 'completed' ? Colors.completed :
    node.status === 'failed' ? Colors.error :
    node.status === 'paused' ? Colors.warning : Colors.border;
  const isRunning = node.status === 'running';

  const content = (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.block,
        isInLoop && styles.blockLoop,
        isSelected && [styles.blockSelected, { borderColor: catColor }],
        pressed && { opacity: 0.88 },
        node.status === 'running' && styles.blockRunning,
        node.status === 'completed' && styles.blockCompleted,
        node.status === 'failed' && styles.blockFailed,
      ]}
    >
      <View style={[styles.blockLeft, { backgroundColor: catColor + '15' }]}>
        <View style={[styles.stepBadge, { backgroundColor: statusColor + '25' }]}>
          <Text style={[styles.stepNum, { color: statusColor }]}>{index + 1}</Text>
        </View>
        <View style={[styles.statusBar, { backgroundColor: statusColor }]} />
      </View>
      <View style={[styles.blockIconWrap, { backgroundColor: def.color + '20' }]}>
        <MaterialCommunityIcons name={def.icon as any} size={18} color={def.color} />
      </View>
      <View style={styles.blockBody}>
        <View style={styles.blockTop}>
          <Text style={styles.blockLabel} numberOfLines={1}>{node.label || def.label}</Text>
          <View style={[styles.catPill, { backgroundColor: catColor + '15', borderColor: catColor + '40' }]}>
            <Text style={[styles.catPillText, { color: catColor }]}>{def.category}</Text>
          </View>
        </View>
        {node.config && Object.keys(node.config).length > 0 && (
          <View style={styles.configRow}>
            {Object.entries(node.config).slice(0, 2).map(([k, v]) => (
              <View key={k} style={styles.configChip}>
                <Text style={styles.configKey}>{k}:</Text>
                <Text style={styles.configVal} numberOfLines={1}>{v}</Text>
              </View>
            ))}
          </View>
        )}
        {node.status && node.status !== 'idle' && (
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {node.status === 'running' ? '▶ يعمل الآن...' :
               node.status === 'completed' ? '✓ مكتمل' :
               node.status === 'failed' ? '✗ فشل' : '⏸ متوقف'}
            </Text>
          </View>
        )}
      </View>
      {isLoopHeader && (
        <Pressable onPress={onToggleLoop} style={styles.loopToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name={loopExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={CAT_COLOR.Logic} />
        </Pressable>
      )}
    </Pressable>
  );

  if (isRunning && pulseAnim) {
    return <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>{content}</Animated.View>;
  }
  return content;
}

// ── Connector ───────────────────────────────────────────────────────
function Connector({ label, isInLoop, isActive }: { label?: string; isInLoop?: boolean; isActive?: boolean }) {
  const color = isActive ? Colors.running : isInLoop ? CAT_COLOR.Logic + '60' : Colors.border;
  return (
    <View style={styles.connector}>
      <View style={[styles.connLine, { backgroundColor: color }]} />
      {label ? (
        <View style={[styles.edgeLabelWrap, { borderColor: color }]}>
          <Text style={[styles.edgeLabel, { color }]}>{label}</Text>
        </View>
      ) : null}
      <MaterialCommunityIcons name="chevron-down" size={13} color={color} />
    </View>
  );
}

// ── Add Node Modal ─────────────────────────────────────────────────
const ALL_CATS: (NodeCategory | 'All')[] = ['All', 'Trigger', 'AI', 'Browser', 'File', 'Task', 'Logic', 'Advanced'];

function AddNodeModal({ visible, onAdd, onClose }: { visible: boolean; onAdd: (type: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState<NodeCategory | 'All'>('All');
  const filtered = NODE_DEFINITIONS.filter(d =>
    (cat === 'All' || d.category === cat) &&
    (!search || d.label.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.addModal}>
        <View style={styles.addModalHeader}>
          <MaterialCommunityIcons name="plus-circle" size={18} color={Colors.primary} />
          <Text style={styles.addModalTitle}>إضافة عقدة</Text>
          <Pressable onPress={onClose} style={{ marginLeft: 'auto' as any }}>
            <MaterialCommunityIcons name="close" size={20} color={Colors.textMuted} />
          </Pressable>
        </View>
        <View style={styles.addSearch}>
          <MaterialCommunityIcons name="magnify" size={14} color={Colors.textMuted} />
          <TextInput value={search} onChangeText={setSearch} placeholder="بحث..." placeholderTextColor={Colors.textDim} style={styles.addSearchInput} autoCapitalize="none" />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 38 }} contentContainerStyle={styles.addCatsRow}>
          {ALL_CATS.map(c => {
            const color = c === 'All' ? Colors.primary : (CAT_COLOR[c] || Colors.primary);
            return (
              <Pressable key={c} onPress={() => setCat(c)}
                style={[styles.catChip, cat === c && { backgroundColor: color + '20', borderColor: color }]}>
                {c !== 'All' && <MaterialCommunityIcons name={CAT_ICON[c] as any} size={11} color={cat === c ? color : Colors.textDim} />}
                <Text style={[styles.catChipText, cat === c && { color }]}>{c === 'All' ? 'الكل' : c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <ScrollView style={styles.addNodeList} showsVerticalScrollIndicator={false}>
          {filtered.map(def => (
            <Pressable key={def.type} onPress={() => { onAdd(def.type); onClose(); }}
              style={({ pressed }) => [styles.addNodeRow, pressed && { backgroundColor: Colors.surface2 }]}>
              <View style={[styles.addNodeIcon, { backgroundColor: def.color + '20' }]}>
                <MaterialCommunityIcons name={def.icon as any} size={18} color={def.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addNodeLabel}>{def.label}</Text>
                <Text style={styles.addNodeDesc} numberOfLines={1}>{def.description}</Text>
              </View>
              <View style={[styles.addCatBadge, { backgroundColor: (CAT_COLOR[def.category] || Colors.primary) + '20' }]}>
                <Text style={[styles.addCatBadgeText, { color: CAT_COLOR[def.category] || Colors.primary }]}>{def.category}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.addModalFooter}>
          <Text style={styles.addModalFooterText}>{filtered.length} عقدة</Text>
        </View>
      </View>
    </Modal>
  );
}

// ── Inspector Panel ────────────────────────────────────────────────
function InspectorPanel({ node, onClose, onDelete }: { node: GraphNode; onClose: () => void; onDelete: () => void }) {
  const def = NODE_DEFINITIONS.find(d => d.type === node.type);
  if (!def) return null;
  const catColor = CAT_COLOR[def.category] || Colors.textDim;
  return (
    <View style={styles.inspector}>
      <View style={styles.inspHeader}>
        <View style={[styles.inspIconWrap, { backgroundColor: def.color + '20' }]}>
          <MaterialCommunityIcons name={def.icon as any} size={18} color={def.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.inspName}>{def.label}</Text>
          <View style={[styles.catPill, { backgroundColor: catColor + '15', borderColor: catColor + '40', marginTop: 2 }]}>
            <Text style={[styles.catPillText, { color: catColor }]}>{def.category}</Text>
          </View>
        </View>
        <Pressable onPress={onDelete} style={[styles.inspBtn, { backgroundColor: Colors.errorDim }]}>
          <MaterialCommunityIcons name="trash-can-outline" size={14} color={Colors.error} />
        </Pressable>
        <Pressable onPress={onClose} style={styles.inspBtn}>
          <MaterialCommunityIcons name="close" size={16} color={Colors.textMuted} />
        </Pressable>
      </View>
      <ScrollView style={styles.inspBody} showsVerticalScrollIndicator={false}>
        <View style={{ padding: Spacing.md, gap: Spacing.md }}>
          <Text style={styles.inspSectionTitle}>الوصف</Text>
          <Text style={styles.inspDesc}>{def.description}</Text>
          {node.config && Object.keys(node.config).length > 0 && (
            <>
              <Text style={styles.inspSectionTitle}>الإعدادات</Text>
              {Object.entries(node.config).map(([k, v]) => (
                <View key={k} style={styles.inspConfigRow}>
                  <Text style={styles.inspConfigKey}>{k}</Text>
                  <Text style={styles.inspConfigVal}>{v}</Text>
                </View>
              ))}
            </>
          )}
          <Text style={styles.inspSectionTitle}>الحالة</Text>
          <View style={[styles.inspStatusBox, {
            backgroundColor: node.status === 'completed' ? Colors.successDim
              : node.status === 'running' ? Colors.primaryDim
              : node.status === 'failed' ? Colors.errorDim
              : Colors.surface2
          }]}>
            <Text style={{
              color: node.status === 'completed' ? Colors.success
                : node.status === 'running' ? Colors.running
                : node.status === 'failed' ? Colors.error
                : Colors.textDim,
              fontSize: FontSize.sm, fontWeight: '700',
            }}>
              {node.status === 'completed' ? '✓ مكتمل' :
               node.status === 'running' ? '▶ يعمل...' :
               node.status === 'failed' ? '✗ فشل' :
               '— في الانتظار'}
            </Text>
          </View>
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ── Main Graph Screen ──────────────────────────────────────────────
export default function GraphScreen() {
  const insets = useSafeAreaInsets();
  const {
    graphNodes, graphEdges, isRunning, isPaused,
    setIsRunning, setIsPaused, addGraphNode, updateNodeStatus,
    removeGraphNode, graphMode, setGraphMode, addNotification,
    isPipelineRunning, startPipeline, stopPipeline, pipelineLogs,
    projectIdea, selectedModelUrl, currentNodeId, executionStep,
  } = useApp();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [loopExpanded, setLoopExpanded] = useState(true);
  const [isDryRun, setIsDryRun] = useState(false);
  const [localStep, setLocalStep] = useState(0);
  const [localLogs, setLocalLogs] = useState<{ text: string; type: string }[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = () => {
    pulseRef.current?.stop();
    pulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.02, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    pulseRef.current.start();
  };

  const stopPulse = () => {
    pulseRef.current?.stop();
    pulseAnim.setValue(1);
  };

  const addLog = useCallback((msg: string, type = 'info') => {
    const t = new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLocalLogs(prev => [...prev.slice(-80), { text: `${t} — ${msg}`, type }]);
  }, []);

  const selectedNode = graphNodes.find(n => n.id === selectedId) || null;
  const effectivelyRunning = isRunning || isPipelineRunning;
  const completedCount = graphNodes.filter(n => n.status === 'completed').length;
  const progress = graphNodes.length > 0 ? completedCount / graphNodes.length : 0;
  const currentRunningId = currentNodeId || graphNodes.find(n => n.status === 'running')?.id;

  const handleRun = () => {
    if (effectivelyRunning) {
      stopPipeline();
      intervalRef.current && clearInterval(intervalRef.current);
      setIsRunning(false);
      setIsPaused(false);
      setLocalStep(0);
      stopPulse();
      graphNodes.forEach(n => updateNodeStatus(n.id, 'idle'));
      addLog('⏹ إيقاف', 'err');
      return;
    }
    if (isPaused) {
      setIsPaused(false);
      startPulse();
      addLog('▶ استئناف', 'run');
      return;
    }

    // Real pipeline if project idea is set
    if (projectIdea && selectedModelUrl && !isDryRun) {
      startPulse();
      startPipeline(projectIdea, selectedModelUrl);
      addLog('🚀 إطلاق Pipeline الحقيقي...', 'run');
      return;
    }

    // Demo simulation
    setIsRunning(true);
    setLocalStep(0);
    startPulse();
    addLog(isDryRun ? '🔁 محاكاة Dry Run' : '▶ تشغيل Demo', 'run');
    let step = 0;
    const ids = graphNodes.map(n => n.id);
    intervalRef.current = setInterval(() => {
      if (step >= ids.length) {
        clearInterval(intervalRef.current!);
        setIsRunning(false);
        stopPulse();
        if (step > 0) updateNodeStatus(ids[step - 1], 'completed');
        addLog('✓ اكتملت المحاكاة', 'ok');
        addNotification({ type: 'success', title: 'اكتملت المحاكاة', message: `${ids.length} عقدة`, screen: 'graph' });
        return;
      }
      const def = NODE_DEFINITIONS.find(d => d.type === graphNodes[step]?.type);
      if (step > 0) updateNodeStatus(ids[step - 1], 'completed');
      updateNodeStatus(ids[step], 'running');
      setLocalStep(step + 1);
      addLog(`▶ ${def?.label || ids[step]}`, 'run');
      step++;
    }, 700);
  };

  const logColor = (type: string) => {
    if (type === 'ok') return Colors.completed;
    if (type === 'run') return Colors.running;
    if (type === 'err') return Colors.error;
    return Colors.textMuted;
  };

  // Sync pipeline logs to local logs
  const logsToShow = isPipelineRunning ? pipelineLogs.map(l => ({ text: `${l.timestamp} — ${l.message}`, type: l.type === 'success' ? 'ok' : l.type === 'running' ? 'run' : l.type === 'error' ? 'err' : 'info' })) : localLogs;

  if (graphMode === 'yaml') {
    return <GraphYAMLView nodes={graphNodes} edges={graphEdges} onClose={() => setGraphMode('visual')} insets={insets} />;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="sitemap" size={18} color={Colors.primary} />
          <Text style={styles.headerTitle}>Graph Engine</Text>
          {effectivelyRunning && !isPaused && (
            <View style={styles.runningBadge}>
              <View style={styles.runDot} />
              <Text style={styles.runText}>يعمل</Text>
            </View>
          )}
          {isPaused && (
            <View style={[styles.runningBadge, { backgroundColor: Colors.warning + '22' }]}>
              <MaterialCommunityIcons name="pause" size={10} color={Colors.warning} />
              <Text style={[styles.runText, { color: Colors.warning }]}>متوقف</Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={() => setIsDryRun(v => !v)} style={[styles.hBtn, isDryRun && styles.hBtnActive]}>
            <MaterialCommunityIcons name="test-tube" size={15} color={isDryRun ? Colors.accent : Colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => setGraphMode('yaml')} style={styles.hBtn}>
            <MaterialCommunityIcons name="code-json" size={15} color={Colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => { setShowAI(v => !v); setSelectedId(null); }} style={[styles.hBtn, showAI && styles.hBtnActive]}>
            <MaterialCommunityIcons name="auto-fix" size={15} color={showAI ? Colors.primary : Colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => setShowAdd(true)} style={styles.hBtn}>
            <MaterialCommunityIcons name="plus" size={17} color={Colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => setShowLogs(v => !v)} style={[styles.hBtn, showLogs && styles.hBtnActive]}>
            <MaterialCommunityIcons name="console" size={15} color={showLogs ? Colors.primary : Colors.textMuted} />
          </Pressable>
          {effectivelyRunning && !isPipelineRunning && (
            <Pressable onPress={() => { setIsPaused(v => !v); }} style={[styles.hBtn, { backgroundColor: Colors.warning + '20' }]}>
              <MaterialCommunityIcons name={isPaused ? 'play' : 'pause'} size={15} color={Colors.warning} />
            </Pressable>
          )}
          <Pressable onPress={handleRun} style={[styles.runBtn, effectivelyRunning && styles.runBtnStop]}>
            <MaterialCommunityIcons name={effectivelyRunning ? 'stop' : 'play'} size={15} color="#fff" />
            <Text style={styles.runBtnText}>
              {effectivelyRunning ? 'إيقاف' : isDryRun ? 'محاكاة' : projectIdea ? 'تشغيل' : 'Demo'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Progress bar */}
      {effectivelyRunning && (
        <View style={styles.progressWrap}>
          <View style={[styles.progressBar, { width: `${progress * 100}%` as any }]} />
          <Text style={styles.progressText}>
            {Math.round(progress * 100)}% — {completedCount}/{graphNodes.length} عقدة
            {isPipelineRunning && pipelineLogs.length > 0 && ` — ${pipelineLogs[pipelineLogs.length - 1]?.message?.substring(0, 40)}`}
          </Text>
        </View>
      )}

      {/* Body */}
      <View style={styles.body}>
        {showAI && (
          <View style={styles.sidePanel}>
            <GraphAIAssistant
              onAddNode={(type) => {
                const def = NODE_DEFINITIONS.find(d => d.type === type);
                if (def) addGraphNode({ id: `n${Date.now()}`, type: type as NodeType, status: 'idle', label: def.label, config: {} });
              }}
              onClose={() => setShowAI(false)}
            />
          </View>
        )}

        <ScrollView style={styles.pipeline} contentContainerStyle={styles.pipelineContent} showsVerticalScrollIndicator={false}>
          {/* Pipeline title */}
          <View style={styles.pipelineTitle}>
            <MaterialCommunityIcons name="vector-line" size={13} color={Colors.primary} />
            <Text style={styles.pipelineTitleText}>سير العمل التلقائي</Text>
            <Text style={styles.pipelineTitleCount}>{graphNodes.length} عقدة</Text>
          </View>

          {graphNodes.map((node, index) => {
            const isLoopNode = node.id === 'n9';
            const isInLoop = LOOP_INNER.includes(node.id);
            const edge = graphEdges.find(e => e.to === node.id);
            const isThisRunning = node.id === currentRunningId;
            const prevNode = index > 0 ? graphNodes[index - 1] : null;
            const isActive = prevNode?.status === 'completed' || isThisRunning;

            if (isInLoop && !loopExpanded) return null;

            return (
              <View key={node.id}>
                {index > 0 && <Connector label={edge?.label} isInLoop={isInLoop} isActive={isActive} />}

                {isLoopNode && (
                  <View style={styles.loopLabel}>
                    <MaterialCommunityIcons name="refresh" size={11} color={CAT_COLOR.Logic} />
                    <Text style={styles.loopLabelText}>بداية حلقة المهام</Text>
                    <View style={styles.loopLabelLine} />
                  </View>
                )}

                {isInLoop ? (
                  <View style={styles.loopRow}>
                    <View style={styles.loopSideline} />
                    <View style={{ flex: 1 }}>
                      <PipelineBlock
                        node={node} index={index}
                        isSelected={selectedId === node.id}
                        isInLoop isLoopHeader={false} loopExpanded={loopExpanded}
                        pulseAnim={isThisRunning ? pulseAnim : undefined}
                        onPress={() => setSelectedId(prev => prev === node.id ? null : node.id)}
                      />
                    </View>
                  </View>
                ) : (
                  <PipelineBlock
                    node={node} index={index}
                    isSelected={selectedId === node.id}
                    isInLoop={false} isLoopHeader={isLoopNode} loopExpanded={loopExpanded}
                    pulseAnim={isThisRunning ? pulseAnim : undefined}
                    onPress={() => setSelectedId(prev => prev === node.id ? null : node.id)}
                    onToggleLoop={() => setLoopExpanded(v => !v)}
                  />
                )}

                {node.id === 'n16' && loopExpanded && (
                  <View style={styles.loopEnd}>
                    <View style={styles.loopEndLine} />
                    <MaterialCommunityIcons name="arrow-u-left-top" size={11} color={CAT_COLOR.Logic} />
                    <Text style={styles.loopEndText}>تكرار للمهمة التالية</Text>
                    <View style={styles.loopEndLine} />
                  </View>
                )}
              </View>
            );
          })}

          <Connector />
          <Pressable onPress={() => setShowAdd(true)} style={styles.addBlockBtn}>
            <MaterialCommunityIcons name="plus-circle-outline" size={20} color={Colors.textDim} />
            <Text style={styles.addBlockText}>إضافة عقدة</Text>
          </Pressable>
          <View style={{ height: 50 }} />
        </ScrollView>

        {selectedNode && (
          <View style={styles.sidePanel}>
            <InspectorPanel
              node={selectedNode}
              onClose={() => setSelectedId(null)}
              onDelete={() => { removeGraphNode(selectedNode.id); setSelectedId(null); }}
            />
          </View>
        )}
      </View>

      {/* Logs */}
      {showLogs && (
        <View style={styles.logsPanel}>
          <View style={styles.logsHeader}>
            <MaterialCommunityIcons name="console" size={11} color={Colors.primary} />
            <Text style={styles.logsTitle}>سجل التنفيذ</Text>
            <Text style={styles.logsCount}>{logsToShow.length}</Text>
            <Pressable onPress={() => setLocalLogs([])} style={{ marginLeft: 'auto' as any }}>
              <Text style={styles.logsClear}>مسح</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.logsList} showsVerticalScrollIndicator={false}>
            {logsToShow.slice(-40).map((l, i) => (
              <Text key={i} style={[styles.logLine, { color: logColor(l.type) }]}>
                {l.type === 'ok' ? '✓' : l.type === 'run' ? '▶' : l.type === 'err' ? '✗' : '·'} {l.text}
              </Text>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Status bar */}
      <View style={[styles.statusBarBottom, { paddingBottom: Math.max(insets.bottom - 50, 6) }]}>
        <Text style={styles.statusItem}>{graphNodes.length} عقدة</Text>
        <Text style={styles.statusSep}>·</Text>
        <Text style={[styles.statusItem, { color: Colors.completed }]}>{completedCount} مكتمل</Text>
        {effectivelyRunning && (
          <>
            <Text style={styles.statusSep}>·</Text>
            <Text style={[styles.statusItem, { color: Colors.running }]}>
              خطوة {executionStep || localStep}/{graphNodes.length}
            </Text>
          </>
        )}
        <View style={{ flex: 1 }} />
        {isPipelineRunning && <Text style={[styles.statusItem, { color: Colors.running }]}>Pipeline نشط</Text>}
        {isDryRun && !effectivelyRunning && <Text style={[styles.statusItem, { color: Colors.accent }]}>Dry Run</Text>}
        {!isPipelineRunning && !effectivelyRunning && <Text style={styles.statusItem}>جاهز</Text>}
      </View>

      <AddNodeModal visible={showAdd} onAdd={(type) => {
        const def = NODE_DEFINITIONS.find(d => d.type === type);
        if (def) addGraphNode({ id: `n${Date.now()}`, type: type as NodeType, status: 'idle', label: def.label, config: {} });
      }} onClose={() => setShowAdd(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  headerTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  runningBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.running + '22', borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
  },
  runDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.running },
  runText: { color: Colors.running, fontSize: FontSize.xs, fontWeight: '600' },
  hBtn: { width: 30, height: 30, borderRadius: Radius.sm, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center' },
  hBtnActive: { backgroundColor: Colors.primaryDim },
  runBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.success, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
  },
  runBtnStop: { backgroundColor: Colors.error },
  runBtnText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '700' },

  progressWrap: {
    height: 28, backgroundColor: Colors.surface2, overflow: 'hidden',
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    justifyContent: 'center', position: 'relative',
  },
  progressBar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: Colors.primary + '30' },
  progressText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700', paddingHorizontal: Spacing.lg, zIndex: 1 },

  body: { flex: 1, flexDirection: 'row' },
  sidePanel: { width: 270, borderLeftWidth: 1, borderLeftColor: Colors.border, backgroundColor: Colors.surface },
  pipeline: { flex: 1 },
  pipelineContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl },

  pipelineTitle: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginBottom: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border + '50',
  },
  pipelineTitleText: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', flex: 1 },
  pipelineTitleCount: { color: Colors.textDim, fontSize: FontSize.xs },

  block: {
    flexDirection: 'row', alignItems: 'stretch',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', minHeight: 60,
  },
  blockLoop: { borderRadius: Radius.md },
  blockSelected: { borderWidth: 1.5 },
  blockRunning: { borderColor: Colors.running + '70', backgroundColor: Colors.running + '06' },
  blockCompleted: { borderColor: Colors.completed + '50' },
  blockFailed: { borderColor: Colors.error + '70', backgroundColor: Colors.error + '05' },

  blockLeft: { width: 34, alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  stepBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepNum: { fontSize: 9, fontWeight: '800' },
  statusBar: { width: 3, flex: 1, borderRadius: 2, marginBottom: Spacing.sm, opacity: 0.7 },

  blockIconWrap: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', margin: Spacing.sm, alignSelf: 'center' },
  blockBody: { flex: 1, paddingVertical: Spacing.md, paddingRight: Spacing.md, justifyContent: 'center' },
  blockTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 3 },
  blockLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', flex: 1 },

  catPill: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: Radius.full, borderWidth: 1 },
  catPillText: { fontSize: 9, fontWeight: '700' },

  configRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginBottom: 3 },
  configChip: {
    flexDirection: 'row', gap: 2, backgroundColor: Colors.surface2,
    borderRadius: Radius.sm, paddingHorizontal: Spacing.xs, paddingVertical: 1, maxWidth: 180,
  },
  configKey: { color: Colors.textDim, fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  configVal: { color: Colors.textMuted, fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', flex: 1 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusText: { fontSize: FontSize.xs, fontWeight: '600' },

  loopToggle: { padding: Spacing.md, alignSelf: 'center' },

  connector: { alignItems: 'center', paddingVertical: 2 },
  connLine: { width: 1.5, height: 12, backgroundColor: Colors.border },
  edgeLabelWrap: {
    borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 1,
    borderWidth: 1, backgroundColor: Colors.surface2, marginBottom: 1,
  },
  edgeLabel: { fontSize: 9 },

  loopLabel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  loopLabelText: { color: CAT_COLOR.Logic, fontSize: FontSize.xs, fontWeight: '700' },
  loopLabelLine: { flex: 1, height: 1, backgroundColor: CAT_COLOR.Logic + '30' },
  loopRow: { flexDirection: 'row' },
  loopSideline: { width: 12, marginLeft: Spacing.md, marginRight: Spacing.sm, borderLeftWidth: 2, borderLeftColor: CAT_COLOR.Logic + '50' },
  loopEnd: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    marginTop: Spacing.xs, marginLeft: Spacing.xl + Spacing.md, marginBottom: Spacing.xs,
    paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm,
    backgroundColor: CAT_COLOR.Logic + '10', borderRadius: Radius.sm,
    borderWidth: 1, borderColor: CAT_COLOR.Logic + '30',
  },
  loopEndLine: { flex: 1, height: 1, backgroundColor: CAT_COLOR.Logic + '30' },
  loopEndText: { color: CAT_COLOR.Logic, fontSize: 9, fontWeight: '600' },

  addBlockBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed',
    paddingVertical: Spacing.lg,
  },
  addBlockText: { color: Colors.textDim, fontSize: FontSize.sm },

  logsPanel: { height: 140, backgroundColor: Colors.bg, borderTopWidth: 1, borderTopColor: Colors.border },
  logsHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.lg, paddingVertical: 5,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  logsTitle: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700', flex: 1 },
  logsCount: { color: Colors.textDim, fontSize: FontSize.xs },
  logsClear: { color: Colors.textDim, fontSize: FontSize.xs },
  logsList: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs },
  logLine: { fontSize: FontSize.xs, lineHeight: 18, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  statusBarBottom: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  statusItem: { color: Colors.textMuted, fontSize: FontSize.xs },
  statusSep: { color: Colors.textDim, fontSize: FontSize.xs },

  // Inspector
  inspector: { flex: 1, backgroundColor: Colors.surface },
  inspHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  inspIconWrap: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  inspName: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  inspBtn: { width: 28, height: 28, borderRadius: Radius.sm, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center' },
  inspBody: { flex: 1 },
  inspSectionTitle: { color: Colors.textDim, fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm },
  inspDesc: { color: Colors.textMuted, fontSize: FontSize.sm, lineHeight: 20 },
  inspConfigRow: {
    flexDirection: 'row', gap: Spacing.sm,
    backgroundColor: Colors.surface2, borderRadius: Radius.sm, padding: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  inspConfigKey: { color: Colors.textDim, fontSize: FontSize.xs, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', minWidth: 60 },
  inspConfigVal: { color: Colors.textMuted, fontSize: FontSize.xs, flex: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  inspStatusBox: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },

  // Add modal
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000080' },
  addModal: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl, maxHeight: '78%',
  },
  addModalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  addModalTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  addSearch: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.bg, borderRadius: Radius.md,
    margin: Spacing.md, paddingHorizontal: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  addSearchInput: { flex: 1, color: Colors.text, fontSize: FontSize.md, paddingVertical: Spacing.sm },
  addCatsRow: { alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: Spacing.sm, paddingVertical: 5,
    borderRadius: Radius.full, backgroundColor: Colors.surface2,
    borderWidth: 1, borderColor: Colors.border,
  },
  catChipText: { color: Colors.textDim, fontSize: 10, fontWeight: '600' },
  addNodeList: { flex: 1 },
  addNodeRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: Spacing.md, paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.border + '40',
  },
  addNodeIcon: { width: 34, height: 34, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  addNodeLabel: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  addNodeDesc: { color: Colors.textDim, fontSize: FontSize.xs, marginTop: 2 },
  addCatBadge: { paddingHorizontal: Spacing.xs, paddingVertical: 2, borderRadius: Radius.sm },
  addCatBadgeText: { fontSize: 9, fontWeight: '700' },
  addModalFooter: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface2,
  },
  addModalFooterText: { color: Colors.textDim, fontSize: FontSize.xs },
});
