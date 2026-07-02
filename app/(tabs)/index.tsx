import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  TextInput, Modal, Platform, Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useApp';
import {
  NODE_DEFINITIONS, GraphNode, NodeType, NodeCategory,
  Script, Selector, Recording, INITIAL_SCRIPTS, INITIAL_SELECTORS, INITIAL_RECORDINGS,
} from '@/services/mockData';
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

// ── Script/Recording node type helpers ──────────────────────────
type ScriptLang = 'javascript' | 'python' | 'recording';
interface AttachedScript {
  nodeId: string;
  lang: ScriptLang;
  code: string;
  name: string;
  recordingId?: string;
}

// ── Breakpoint state ─────────────────────────────────────────────
interface BreakpointInfo {
  nodeId: string;
  label: string;
  context: Record<string, any>;
}

// ── Pipeline Block ─────────────────────────────────────────────────
function PipelineBlock({
  node, index, isSelected, isInLoop, isLoopHeader, loopExpanded, pulseAnim,
  onPress, onToggleLoop, isBreakpointHit, hasBreakpoint,
}: {
  node: GraphNode; index: number; isSelected: boolean; isInLoop: boolean;
  isLoopHeader: boolean; loopExpanded: boolean; pulseAnim?: Animated.Value;
  onPress: () => void; onToggleLoop?: () => void;
  isBreakpointHit?: boolean; hasBreakpoint?: boolean;
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
  const bpColor = '#FF4081';

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
        isBreakpointHit && styles.blockBreakpointHit,
      ]}
    >
      {/* Breakpoint dot */}
      {hasBreakpoint && (
        <View style={[styles.bpDot, isBreakpointHit && styles.bpDotActive]} />
      )}

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
          {node.isBreakpoint && (
            <View style={styles.bpBadge}>
              <MaterialCommunityIcons name="debug-step-over" size={9} color={bpColor} />
              <Text style={styles.bpBadgeText}>BP</Text>
            </View>
          )}
        </View>
        {node.config && Object.keys(node.config).length > 0 && (
          <View style={styles.configRow}>
            {Object.entries(node.config).slice(0, 2).map(([k, v]) => (
              <View key={k} style={styles.configChip}>
                <Text style={styles.configKey}>{k}:</Text>
                <Text style={styles.configVal} numberOfLines={1}>{String(v)}</Text>
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
        {isBreakpointHit && (
          <View style={styles.bpHitRow}>
            <MaterialCommunityIcons name="pause-circle" size={12} color={bpColor} />
            <Text style={styles.bpHitText}>⏸ Breakpoint — فحص السياق</Text>
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

function AddNodeModal({ visible, onAdd, onClose }: {
  visible: boolean; onAdd: (type: string) => void; onClose: () => void;
}) {
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
          <TextInput value={search} onChangeText={setSearch}
            placeholder="بحث..." placeholderTextColor={Colors.textDim}
            style={styles.addSearchInput} autoCapitalize="none" />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ maxHeight: 38 }} contentContainerStyle={styles.addCatsRow}>
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

// ── Script Editor Modal ─────────────────────────────────────────────
function ScriptEditorModal({
  visible, nodeId, nodeLabel, attached, onSave, onClose,
}: {
  visible: boolean; nodeId: string; nodeLabel: string;
  attached?: AttachedScript;
  onSave: (s: AttachedScript) => void;
  onClose: () => void;
}) {
  const [lang, setLang] = useState<ScriptLang>(attached?.lang || 'javascript');
  const [code, setCode] = useState(attached?.code || '');
  const [name, setName] = useState(attached?.name || '');

  useEffect(() => {
    if (visible) {
      setLang(attached?.lang || 'javascript');
      setCode(attached?.code || '');
      setName(attached?.name || '');
    }
  }, [visible, attached]);

  const TEMPLATES: Record<ScriptLang, string> = {
    javascript: `// JavaScript — يعمل مباشرة في WebView\n(function() {\n  // كودك هنا\n  var result = document.title;\n  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(\n    JSON.stringify({ type: 'script_result', value: result })\n  );\n})();`,
    python: `# Python — يُشغَّل في بيئة sandbox المحلية\nimport json\n\ndef run(context):\n    # context يحتوي على بيانات السياق الحالي\n    result = {"status": "ok", "message": "تم التنفيذ"}\n    return result`,
    recording: `انتقل إلى: https://chat.deepseek.com\nانتظر ظهور: #chat-input\nاكتب في: #chat-input ← "\${prompt}"\nانقر: button[data-testid="send-button"]\nانتظر اختفاء: button[aria-label="Stop"]\nاستخرج: .response-container:last-child`,
  };

  const LANG_COLOR: Record<ScriptLang, string> = {
    javascript: '#F0DB4F', python: '#3776AB', recording: Colors.error,
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop2}>
        <View style={styles.scriptEditorModal}>
          {/* Header */}
          <View style={styles.seHeader}>
            <MaterialCommunityIcons name="code-braces" size={18} color={Colors.primary} />
            <Text style={styles.seTitle}>Script Editor</Text>
            <Text style={styles.seNodeLabel} numberOfLines={1}>{nodeLabel}</Text>
            <Pressable onPress={onClose} style={{ marginLeft: 'auto' as any }}>
              <MaterialCommunityIcons name="close" size={20} color={Colors.textMuted} />
            </Pressable>
          </View>

          {/* Lang selector */}
          <View style={styles.seLangRow}>
            {(['javascript', 'python', 'recording'] as ScriptLang[]).map(l => (
              <Pressable key={l} onPress={() => {
                setLang(l);
                if (!code) setCode(TEMPLATES[l]);
              }} style={[styles.seLangBtn, lang === l && { backgroundColor: LANG_COLOR[l] + '25', borderColor: LANG_COLOR[l] }]}>
                <MaterialCommunityIcons
                  name={l === 'javascript' ? 'language-javascript' : l === 'python' ? 'language-python' : 'record-circle'}
                  size={14} color={lang === l ? LANG_COLOR[l] : Colors.textDim}
                />
                <Text style={[styles.seLangText, lang === l && { color: LANG_COLOR[l], fontWeight: '700' }]}>
                  {l === 'javascript' ? 'JavaScript' : l === 'python' ? 'Python' : 'Browser Recording'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Name */}
          <TextInput
            value={name} onChangeText={setName}
            placeholder={`اسم الـ ${lang === 'recording' ? 'Recording' : 'Script'}...`}
            placeholderTextColor={Colors.textDim}
            style={styles.seNameInput}
          />

          {/* Template button */}
          <Pressable onPress={() => setCode(TEMPLATES[lang])} style={styles.seTemplateBtn}>
            <MaterialCommunityIcons name="file-code-outline" size={13} color={Colors.accent} />
            <Text style={styles.seTemplateText}>استخدم Template</Text>
          </Pressable>

          {/* Code area */}
          <View style={styles.seCodeWrap}>
            <View style={styles.seCodeHeader}>
              <View style={[styles.seLangDot, { backgroundColor: LANG_COLOR[lang] }]} />
              <Text style={[styles.seCodeLangLabel, { color: LANG_COLOR[lang] }]}>
                {lang === 'recording' ? 'Recording Steps (واحدة لكل سطر)' : lang.toUpperCase()}
              </Text>
            </View>
            <ScrollView style={styles.seCodeScroll} showsVerticalScrollIndicator={false}>
              <TextInput
                value={code} onChangeText={setCode}
                multiline scrollEnabled={false}
                style={styles.seCodeInput}
                autoCapitalize="none" autoCorrect={false} spellCheck={false}
                textAlignVertical="top"
                placeholder={TEMPLATES[lang]}
                placeholderTextColor={Colors.textDim}
              />
            </ScrollView>
          </View>

          {/* Actions */}
          <View style={styles.seActions}>
            <Pressable onPress={onClose} style={styles.seCancelBtn}>
              <Text style={styles.seCancelText}>إلغاء</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!code.trim()) return;
                onSave({ nodeId, lang, code: code.trim(), name: name.trim() || `${lang} script` });
                onClose();
              }}
              style={[styles.seSaveBtn, !code.trim() && { opacity: 0.4 }]}
              disabled={!code.trim()}
            >
              <MaterialCommunityIcons name="content-save" size={15} color="#fff" />
              <Text style={styles.seSaveText}>حفظ</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Browser Recording Attach Modal ──────────────────────────────────
function RecordingPickModal({
  visible, nodeId, nodeLabel, recordings, onAttach, onClose,
}: {
  visible: boolean; nodeId: string; nodeLabel: string;
  recordings: Recording[];
  onAttach: (s: AttachedScript) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.addModal}>
        <View style={styles.addModalHeader}>
          <MaterialCommunityIcons name="record-circle" size={18} color={Colors.error} />
          <Text style={styles.addModalTitle}>ربط Browser Recording</Text>
          <Text style={styles.seNodeLabel} numberOfLines={1}> — {nodeLabel}</Text>
          <Pressable onPress={onClose} style={{ marginLeft: 'auto' as any }}>
            <MaterialCommunityIcons name="close" size={20} color={Colors.textMuted} />
          </Pressable>
        </View>
        <ScrollView style={styles.addNodeList} showsVerticalScrollIndicator={false}>
          {recordings.length === 0 && (
            <View style={styles.emptyRecording}>
              <MaterialCommunityIcons name="record-circle" size={38} color={Colors.textDim} />
              <Text style={styles.emptyRecordingText}>لا يوجد تسجيلات</Text>
              <Text style={styles.emptyRecordingSubText}>سجّل خطوات في شاشة المتصفح أولاً</Text>
            </View>
          )}
          {recordings.map(rec => (
            <Pressable key={rec.id}
              onPress={() => {
                onAttach({
                  nodeId, lang: 'recording',
                  code: rec.steps.join('\n'),
                  name: rec.name,
                  recordingId: rec.id,
                });
                onClose();
              }}
              style={({ pressed }) => [styles.addNodeRow, pressed && { backgroundColor: Colors.surface2 }]}
            >
              <View style={[styles.addNodeIcon, { backgroundColor: Colors.error + '20' }]}>
                <MaterialCommunityIcons name="record-circle" size={18} color={Colors.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.addNodeLabel}>{rec.name}</Text>
                <Text style={styles.addNodeDesc} numberOfLines={1}>
                  {rec.steps.length} خطوة · {rec.duration}
                </Text>
              </View>
              <MaterialCommunityIcons name="link-variant" size={16} color={Colors.textDim} />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Breakpoint Panel ─────────────────────────────────────────────────
function BreakpointPanel({
  info, onContinue, onStepOver, onAbort,
}: {
  info: BreakpointInfo;
  onContinue: () => void;
  onStepOver: () => void;
  onAbort: () => void;
}) {
  const bpColor = '#FF4081';
  return (
    <View style={styles.bpPanel}>
      <View style={styles.bpPanelHeader}>
        <MaterialCommunityIcons name="pause-circle" size={16} color={bpColor} />
        <Text style={styles.bpPanelTitle}>⏸ Breakpoint Hit</Text>
        <Text style={styles.bpPanelNode} numberOfLines={1}>{info.label}</Text>
      </View>
      <View style={styles.bpContextSection}>
        <Text style={styles.bpContextLabel}>السياق الحالي:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.bpContextBox}>
            {Object.entries(info.context).length === 0 ? (
              <Text style={styles.bpContextEmpty}>لا يوجد سياق</Text>
            ) : (
              Object.entries(info.context).map(([k, v]) => (
                <View key={k} style={styles.bpContextRow}>
                  <Text style={styles.bpContextKey}>{k}:</Text>
                  <Text style={styles.bpContextVal} numberOfLines={1}>{String(v)}</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
      <View style={styles.bpActions}>
        <Pressable onPress={onContinue} style={[styles.bpActionBtn, { backgroundColor: Colors.success + '20', borderColor: Colors.success + '50' }]}>
          <MaterialCommunityIcons name="play" size={14} color={Colors.success} />
          <Text style={[styles.bpActionText, { color: Colors.success }]}>متابعة</Text>
        </Pressable>
        <Pressable onPress={onStepOver} style={[styles.bpActionBtn, { backgroundColor: Colors.warning + '20', borderColor: Colors.warning + '50' }]}>
          <MaterialCommunityIcons name="debug-step-over" size={14} color={Colors.warning} />
          <Text style={[styles.bpActionText, { color: Colors.warning }]}>Step Over</Text>
        </Pressable>
        <Pressable onPress={onAbort} style={[styles.bpActionBtn, { backgroundColor: Colors.error + '15', borderColor: Colors.error + '40' }]}>
          <MaterialCommunityIcons name="stop" size={14} color={Colors.error} />
          <Text style={[styles.bpActionText, { color: Colors.error }]}>إيقاف</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Enhanced Inspector Panel ─────────────────────────────────────────
function InspectorPanel({
  node, attachedScript, onClose, onDelete, onToggleBreakpoint,
  onOpenScriptEditor, onOpenRecordingPicker,
}: {
  node: GraphNode;
  attachedScript?: AttachedScript;
  onClose: () => void;
  onDelete: () => void;
  onToggleBreakpoint: () => void;
  onOpenScriptEditor: () => void;
  onOpenRecordingPicker: () => void;
}) {
  const def = NODE_DEFINITIONS.find(d => d.type === node.type);
  if (!def) return null;
  const catColor = CAT_COLOR[def.category] || Colors.textDim;
  const bpColor = '#FF4081';
  const scriptLangColor: Record<ScriptLang, string> = {
    javascript: '#F0DB4F', python: '#3776AB', recording: Colors.error,
  };

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

          {/* Breakpoint toggle */}
          <Pressable onPress={onToggleBreakpoint}
            style={[styles.inspBpToggle, node.isBreakpoint && styles.inspBpToggleActive]}>
            <MaterialCommunityIcons name="debug-step-over" size={15}
              color={node.isBreakpoint ? bpColor : Colors.textDim} />
            <Text style={[styles.inspBpToggleText, node.isBreakpoint && { color: bpColor }]}>
              {node.isBreakpoint ? '⏸ Breakpoint مفعّل' : 'إضافة Breakpoint'}
            </Text>
            {node.isBreakpoint && (
              <View style={styles.inspBpDot} />
            )}
          </Pressable>

          {/* Attached script section */}
          <View style={styles.inspSection}>
            <Text style={styles.inspSectionTitle}>📎 Script مُرفق</Text>
            {attachedScript ? (
              <View style={[styles.attachedScriptBox, { borderColor: scriptLangColor[attachedScript.lang] + '50' }]}>
                <View style={styles.attachedScriptTop}>
                  <MaterialCommunityIcons
                    name={attachedScript.lang === 'javascript' ? 'language-javascript' : attachedScript.lang === 'python' ? 'language-python' : 'record-circle'}
                    size={14} color={scriptLangColor[attachedScript.lang]}
                  />
                  <Text style={[styles.attachedScriptName, { color: scriptLangColor[attachedScript.lang] }]}>
                    {attachedScript.name}
                  </Text>
                  <View style={[styles.attachedLangPill, { backgroundColor: scriptLangColor[attachedScript.lang] + '20' }]}>
                    <Text style={[styles.attachedLangText, { color: scriptLangColor[attachedScript.lang] }]}>
                      {attachedScript.lang}
                    </Text>
                  </View>
                </View>
                <Text style={styles.attachedScriptCode} numberOfLines={3}>
                  {attachedScript.code.substring(0, 120)}...
                </Text>
                <Pressable onPress={onOpenScriptEditor} style={styles.attachedEditBtn}>
                  <MaterialCommunityIcons name="pencil" size={12} color={Colors.primary} />
                  <Text style={styles.attachedEditText}>تعديل</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.noScriptBox}>
                <View style={styles.scriptAttachBtns}>
                  <Pressable onPress={onOpenScriptEditor} style={styles.scriptAttachBtn}>
                    <MaterialCommunityIcons name="language-javascript" size={13} color='#F0DB4F' />
                    <Text style={[styles.scriptAttachBtnText, { color: '#F0DB4F' }]}>JS</Text>
                  </Pressable>
                  <Pressable onPress={onOpenScriptEditor} style={[styles.scriptAttachBtn, { borderColor: '#3776AB' + '50' }]}>
                    <MaterialCommunityIcons name="language-python" size={13} color='#3776AB' />
                    <Text style={[styles.scriptAttachBtnText, { color: '#3776AB' }]}>Python</Text>
                  </Pressable>
                  <Pressable onPress={onOpenRecordingPicker} style={[styles.scriptAttachBtn, { borderColor: Colors.error + '50' }]}>
                    <MaterialCommunityIcons name="record-circle" size={13} color={Colors.error} />
                    <Text style={[styles.scriptAttachBtnText, { color: Colors.error }]}>Recording</Text>
                  </Pressable>
                </View>
                <Text style={styles.noScriptHint}>اربط سكريبت أو تسجيل بهذه العقدة</Text>
              </View>
            )}
          </View>

          {/* Description */}
          <View style={styles.inspSection}>
            <Text style={styles.inspSectionTitle}>الوصف</Text>
            <Text style={styles.inspDesc}>{def.description}</Text>
          </View>

          {/* Config */}
          {node.config && Object.keys(node.config).length > 0 && (
            <View style={styles.inspSection}>
              <Text style={styles.inspSectionTitle}>الإعدادات</Text>
              {Object.entries(node.config).map(([k, v]) => (
                <View key={k} style={styles.inspConfigRow}>
                  <Text style={styles.inspConfigKey}>{k}</Text>
                  <Text style={styles.inspConfigVal}>{String(v)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Status */}
          <View style={styles.inspSection}>
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
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ── Library Quick Panel (Scripts/Selectors/Recordings) ───────────────
function LibraryQuickPanel({
  scripts, selectors, recordings, onAttachToNode, onClose,
}: {
  scripts: Script[]; selectors: Selector[]; recordings: Recording[];
  onAttachToNode: (s: AttachedScript) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'scripts' | 'selectors' | 'recordings'>('scripts');
  const [search, setSearch] = useState('');

  return (
    <View style={styles.libPanel}>
      <View style={styles.libPanelHeader}>
        <MaterialCommunityIcons name="bookshelf" size={15} color={Colors.primary} />
        <Text style={styles.libPanelTitle}>المكتبة</Text>
        <Pressable onPress={onClose} style={{ marginLeft: 'auto' as any }}>
          <MaterialCommunityIcons name="close" size={16} color={Colors.textMuted} />
        </Pressable>
      </View>
      <View style={styles.libTabRow}>
        {(['scripts', 'selectors', 'recordings'] as const).map(t => (
          <Pressable key={t} onPress={() => setTab(t)}
            style={[styles.libTab, tab === t && styles.libTabActive]}>
            <Text style={[styles.libTabText, tab === t && styles.libTabTextActive]}>
              {t === 'scripts' ? 'سكريبتات' : t === 'selectors' ? 'Selectors' : 'تسجيلات'}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.libSearchRow}>
        <MaterialCommunityIcons name="magnify" size={12} color={Colors.textDim} />
        <TextInput value={search} onChangeText={setSearch}
          placeholder="بحث..." placeholderTextColor={Colors.textDim}
          style={styles.libSearchInput} />
      </View>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {tab === 'scripts' && scripts
          .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()))
          .map(s => (
            <Pressable key={s.id}
              onPress={() => onAttachToNode({ nodeId: '', lang: 'javascript', code: s.code, name: s.name })}
              style={({ pressed }) => [styles.libItem, pressed && { opacity: 0.8 }]}>
              <MaterialCommunityIcons name="code-braces" size={14} color="#F0DB4F" />
              <View style={{ flex: 1 }}>
                <Text style={styles.libItemName}>{s.name}</Text>
                <Text style={styles.libItemDesc} numberOfLines={1}>{s.description}</Text>
              </View>
              <MaterialCommunityIcons name="plus-circle-outline" size={14} color={Colors.primary} />
            </Pressable>
          ))
        }
        {tab === 'selectors' && selectors
          .filter(s => !search || s.selector.includes(search) || s.name.toLowerCase().includes(search.toLowerCase()))
          .map(s => (
            <Pressable key={s.id}
              onPress={() => onAttachToNode({ nodeId: '', lang: 'javascript', code: `document.querySelector('${s.selector}')`, name: s.name })}
              style={({ pressed }) => [styles.libItem, pressed && { opacity: 0.8 }]}>
              <MaterialCommunityIcons name="crosshairs-gps" size={14} color={Colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.libItemName}>{s.name}</Text>
                <Text style={[styles.libItemDesc, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]} numberOfLines={1}>{s.selector}</Text>
              </View>
              <MaterialCommunityIcons name="plus-circle-outline" size={14} color={Colors.primary} />
            </Pressable>
          ))
        }
        {tab === 'recordings' && recordings
          .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()))
          .map(r => (
            <Pressable key={r.id}
              onPress={() => onAttachToNode({ nodeId: '', lang: 'recording', code: r.steps.join('\n'), name: r.name, recordingId: r.id })}
              style={({ pressed }) => [styles.libItem, pressed && { opacity: 0.8 }]}>
              <MaterialCommunityIcons name="record-circle" size={14} color={Colors.error} />
              <View style={{ flex: 1 }}>
                <Text style={styles.libItemName}>{r.name}</Text>
                <Text style={styles.libItemDesc} numberOfLines={1}>{r.steps.length} خطوة · {r.duration}</Text>
              </View>
              <MaterialCommunityIcons name="plus-circle-outline" size={14} color={Colors.primary} />
            </Pressable>
          ))
        }
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// ── Main Graph Screen ─────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
export default function GraphScreen() {
  const insets = useSafeAreaInsets();
  const {
    graphNodes, graphEdges, isRunning, isPaused,
    setIsRunning, setIsPaused, addGraphNode, updateNodeStatus,
    removeGraphNode, graphMode, setGraphMode, addNotification,
    isPipelineRunning, startPipeline, stopPipeline, pipelineLogs,
    projectIdea, selectedModelUrl, currentNodeId, executionStep,
    scripts, selectors, recordings, webViewBridge,
  } = useApp();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showLib, setShowLib] = useState(false);
  const [loopExpanded, setLoopExpanded] = useState(true);
  const [isDryRun, setIsDryRun] = useState(false);
  const [localStep, setLocalStep] = useState(0);
  const [localLogs, setLocalLogs] = useState<{ text: string; type: string }[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Script attachment state
  const [attachedScripts, setAttachedScripts] = useState<Record<string, AttachedScript>>({});
  const [showScriptEditor, setShowScriptEditor] = useState(false);
  const [showRecordingPick, setShowRecordingPick] = useState(false);
  const [scriptEditorNodeId, setScriptEditorNodeId] = useState('');

  // Breakpoints
  const [breakpointHit, setBreakpointHit] = useState<BreakpointInfo | null>(null);
  const breakpointResumeRef = useRef<(() => void) | null>(null);

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

  const stopPulse = () => { pulseRef.current?.stop(); pulseAnim.setValue(1); };

  const addLog = useCallback((msg: string, type = 'info') => {
    const t = new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLocalLogs(prev => [...prev.slice(-80), { text: `${t} — ${msg}`, type }]);
  }, []);

  const selectedNode = graphNodes.find(n => n.id === selectedId) || null;
  const effectivelyRunning = isRunning || isPipelineRunning;
  const completedCount = graphNodes.filter(n => n.status === 'completed').length;
  const progress = graphNodes.length > 0 ? completedCount / graphNodes.length : 0;
  const currentRunningId = currentNodeId || graphNodes.find(n => n.status === 'running')?.id;

  // Toggle breakpoint on a node
  const toggleBreakpoint = (nodeId: string) => {
    const node = graphNodes.find(n => n.id === nodeId);
    if (!node) return;
    const now = !node.isBreakpoint;
    updateNodeStatus(nodeId, node.status || 'idle');
    // We modify the node directly via addGraphNode trick since we can't update arbitrary fields
    // Use a workaround: store breakpoints in a separate set
    setNodeBreakpoints(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
    addLog(now ? `🔴 Breakpoint مضاف: ${node.label}` : `⚪ Breakpoint محذوف: ${node.label}`, now ? 'run' : 'info');
    addNotification({ type: now ? 'warning' : 'info', title: now ? 'Breakpoint مُضاف' : 'Breakpoint محذوف', message: node.label || nodeId, screen: 'graph' });
  };

  const [nodeBreakpoints, setNodeBreakpoints] = useState<Set<string>>(new Set());

  // Demo execution with breakpoint support
  const handleRun = () => {
    if (effectivelyRunning) {
      stopPipeline();
      intervalRef.current && clearInterval(intervalRef.current);
      setIsRunning(false);
      setIsPaused(false);
      setLocalStep(0);
      setBreakpointHit(null);
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

    if (projectIdea && selectedModelUrl && !isDryRun) {
      startPulse();
      startPipeline(projectIdea, selectedModelUrl);
      addLog('🚀 إطلاق Pipeline الحقيقي...', 'run');
      return;
    }

    // Demo simulation with breakpoints
    setIsRunning(true);
    setLocalStep(0);
    setBreakpointHit(null);
    startPulse();
    addLog(isDryRun ? '🔁 محاكاة Dry Run مع Breakpoints' : '▶ تشغيل Demo', 'run');

    let step = 0;
    const ids = graphNodes.map(n => n.id);

    const runStep = () => {
      if (step >= ids.length) {
        setIsRunning(false);
        stopPulse();
        if (step > 0) updateNodeStatus(ids[step - 1], 'completed');
        addLog('✓ اكتملت المحاكاة', 'ok');
        addNotification({ type: 'success', title: 'اكتملت المحاكاة', message: `${ids.length} عقدة`, screen: 'graph' });
        return;
      }

      const currentNode = graphNodes[step];
      const def = NODE_DEFINITIONS.find(d => d.type === currentNode?.type);

      if (step > 0) updateNodeStatus(ids[step - 1], 'completed');
      updateNodeStatus(ids[step], 'running');
      setLocalStep(step + 1);

      const nodeId = ids[step];
      const nodeLabel = currentNode?.label || def?.label || nodeId;

      // Execute attached script
      if (attachedScripts[nodeId]) {
        const as = attachedScripts[nodeId];
        addLog(`📎 تشغيل ${as.lang === 'recording' ? 'Recording' : as.lang}: "${as.name}"`, 'run');
        if (as.lang === 'javascript' && webViewBridge) {
          webViewBridge.injectJS(as.code);
          addLog(`✓ JS injected في Browser`, 'ok');
        } else if (as.lang === 'recording') {
          const steps = as.code.split('\n').filter(Boolean);
          addLog(`▶ Recording: ${steps.length} خطوة`, 'run');
        }
      }

      addLog(`▶ ${nodeLabel}`, 'run');

      // Check breakpoint
      if (nodeBreakpoints.has(nodeId)) {
        addLog(`⏸ Breakpoint: ${nodeLabel}`, 'run');
        setBreakpointHit({
          nodeId,
          label: nodeLabel,
          context: {
            step: step + 1,
            totalSteps: ids.length,
            nodeType: currentNode?.type || '?',
            hasScript: !!attachedScripts[nodeId],
            ...(attachedScripts[nodeId] ? { scriptLang: attachedScripts[nodeId].lang } : {}),
          },
        });
        setIsPaused(true);
        stopPulse();

        breakpointResumeRef.current = () => {
          setBreakpointHit(null);
          setIsPaused(false);
          startPulse();
          step++;
          intervalRef.current = setTimeout(runStep, 600);
        };
        return;
      }

      step++;
      intervalRef.current = setTimeout(runStep, 700);
    };

    runStep();
  };

  const handleBreakpointContinue = () => {
    if (breakpointResumeRef.current) breakpointResumeRef.current();
  };

  const handleBreakpointStepOver = () => {
    setBreakpointHit(null);
    setIsPaused(false);
    startPulse();
    addLog('⏩ Step Over', 'info');
    if (breakpointResumeRef.current) breakpointResumeRef.current();
  };

  const handleBreakpointAbort = () => {
    setBreakpointHit(null);
    setIsPaused(false);
    setIsRunning(false);
    stopPulse();
    intervalRef.current && clearTimeout(intervalRef.current as any);
    graphNodes.forEach(n => { if (n.status === 'running') updateNodeStatus(n.id, 'idle'); });
    addLog('⏹ Pipeline مُلغى عند Breakpoint', 'err');
  };

  const logColor = (type: string) => {
    if (type === 'ok') return Colors.completed;
    if (type === 'run') return Colors.running;
    if (type === 'err') return Colors.error;
    return Colors.textMuted;
  };

  const logsToShow = isPipelineRunning
    ? pipelineLogs.map(l => ({
        text: `${l.timestamp} — ${l.message}`,
        type: l.type === 'success' ? 'ok' : l.type === 'running' ? 'run' : l.type === 'error' ? 'err' : 'info',
      }))
    : localLogs;

  const totalBreakpoints = nodeBreakpoints.size;
  const attachedCount = Object.keys(attachedScripts).length;

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
              <Text style={[styles.runText, { color: Colors.warning }]}>
                {breakpointHit ? 'Breakpoint' : 'متوقف'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          {/* Breakpoints badge */}
          {totalBreakpoints > 0 && (
            <View style={styles.bpCountBadge}>
              <MaterialCommunityIcons name="debug-step-over" size={11} color="#FF4081" />
              <Text style={styles.bpCountText}>{totalBreakpoints}</Text>
            </View>
          )}
          {/* Scripts badge */}
          {attachedCount > 0 && (
            <View style={styles.scriptCountBadge}>
              <MaterialCommunityIcons name="code-braces" size={11} color="#F0DB4F" />
              <Text style={styles.scriptCountText}>{attachedCount}</Text>
            </View>
          )}
          <Pressable onPress={() => setIsDryRun(v => !v)} style={[styles.hBtn, isDryRun && styles.hBtnActive]}>
            <MaterialCommunityIcons name="test-tube" size={15} color={isDryRun ? Colors.accent : Colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => setGraphMode('yaml')} style={styles.hBtn}>
            <MaterialCommunityIcons name="code-json" size={15} color={Colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => { setShowLib(v => !v); setShowAI(false); setSelectedId(null); }}
            style={[styles.hBtn, showLib && styles.hBtnActive]}>
            <MaterialCommunityIcons name="bookshelf" size={15} color={showLib ? Colors.primary : Colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => { setShowAI(v => !v); setShowLib(false); setSelectedId(null); }}
            style={[styles.hBtn, showAI && styles.hBtnActive]}>
            <MaterialCommunityIcons name="auto-fix" size={15} color={showAI ? Colors.primary : Colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => setShowAdd(true)} style={styles.hBtn}>
            <MaterialCommunityIcons name="plus" size={17} color={Colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => setShowLogs(v => !v)} style={[styles.hBtn, showLogs && styles.hBtnActive]}>
            <MaterialCommunityIcons name="console" size={15} color={showLogs ? Colors.primary : Colors.textMuted} />
          </Pressable>
          {effectivelyRunning && !isPipelineRunning && !breakpointHit && (
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

      {/* Breakpoint panel */}
      {breakpointHit && (
        <BreakpointPanel
          info={breakpointHit}
          onContinue={handleBreakpointContinue}
          onStepOver={handleBreakpointStepOver}
          onAbort={handleBreakpointAbort}
        />
      )}

      {/* Body */}
      <View style={styles.body}>
        {/* Library quick panel */}
        {showLib && (
          <View style={styles.sidePanel}>
            <LibraryQuickPanel
              scripts={scripts || INITIAL_SCRIPTS}
              selectors={selectors || INITIAL_SELECTORS}
              recordings={recordings || INITIAL_RECORDINGS}
              onAttachToNode={(s) => {
                if (selectedId) {
                  setAttachedScripts(prev => ({ ...prev, [selectedId]: { ...s, nodeId: selectedId } }));
                  addLog(`📎 ربط "${s.name}" → عقدة ${selectedId}`, 'ok');
                  addNotification({ type: 'success', title: 'Script مربوط', message: `"${s.name}" → العقدة المختارة`, screen: 'graph' });
                } else {
                  addNotification({ type: 'warning', title: 'اختر عقدة أولاً', message: 'انقر على عقدة لربط الـ Script بها', screen: 'graph' });
                }
              }}
              onClose={() => setShowLib(false)}
            />
          </View>
        )}

        {/* AI assistant */}
        {showAI && !showLib && (
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

        {/* Pipeline canvas */}
        <ScrollView style={styles.pipeline} contentContainerStyle={styles.pipelineContent} showsVerticalScrollIndicator={false}>
          {/* Pipeline title */}
          <View style={styles.pipelineTitle}>
            <MaterialCommunityIcons name="vector-line" size={13} color={Colors.primary} />
            <Text style={styles.pipelineTitleText}>سير العمل التلقائي</Text>
            <Text style={styles.pipelineTitleCount}>{graphNodes.length} عقدة</Text>
            {totalBreakpoints > 0 && (
              <View style={styles.bpSummary}>
                <MaterialCommunityIcons name="debug-step-over" size={10} color="#FF4081" />
                <Text style={styles.bpSummaryText}>{totalBreakpoints} BP</Text>
              </View>
            )}
            {attachedCount > 0 && (
              <View style={styles.scriptSummary}>
                <MaterialCommunityIcons name="code-braces" size={10} color="#F0DB4F" />
                <Text style={styles.scriptSummaryText}>{attachedCount} scripts</Text>
              </View>
            )}
          </View>

          {graphNodes.map((node, index) => {
            const isLoopNode = node.id === 'n9';
            const isInLoop = LOOP_INNER.includes(node.id);
            const edge = graphEdges.find(e => e.to === node.id);
            const isThisRunning = node.id === currentRunningId;
            const prevNode = index > 0 ? graphNodes[index - 1] : null;
            const isActive = prevNode?.status === 'completed' || isThisRunning;
            const hasScript = !!attachedScripts[node.id];
            const hasBp = nodeBreakpoints.has(node.id);
            const isBpHit = breakpointHit?.nodeId === node.id;

            if (isInLoop && !loopExpanded) return null;

            return (
              <View key={node.id}>
                {index > 0 && <Connector label={edge?.label} isInLoop={isInLoop} isActive={isActive} />}

                {/* Script/Recording indicator above block */}
                {hasScript && (
                  <View style={styles.scriptIndicator}>
                    <MaterialCommunityIcons
                      name={attachedScripts[node.id].lang === 'recording' ? 'record-circle' : attachedScripts[node.id].lang === 'python' ? 'language-python' : 'language-javascript'}
                      size={10}
                      color={attachedScripts[node.id].lang === 'recording' ? Colors.error : attachedScripts[node.id].lang === 'python' ? '#3776AB' : '#F0DB4F'}
                    />
                    <Text style={[styles.scriptIndicatorText, {
                      color: attachedScripts[node.id].lang === 'recording' ? Colors.error : attachedScripts[node.id].lang === 'python' ? '#3776AB' : '#F0DB4F',
                    }]}>
                      {attachedScripts[node.id].name}
                    </Text>
                    <Pressable onPress={() => {
                      setScriptEditorNodeId(node.id);
                      setShowScriptEditor(true);
                    }} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <MaterialCommunityIcons name="pencil" size={10} color={Colors.textDim} />
                    </Pressable>
                    <Pressable onPress={() => setAttachedScripts(prev => {
                      const next = { ...prev }; delete next[node.id]; return next;
                    })} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <MaterialCommunityIcons name="close" size={10} color={Colors.error} />
                    </Pressable>
                  </View>
                )}

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
                        hasBreakpoint={hasBp}
                        isBreakpointHit={isBpHit}
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
                    hasBreakpoint={hasBp}
                    isBreakpointHit={isBpHit}
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

        {/* Inspector panel */}
        {selectedNode && !showLib && !showAI && (
          <View style={styles.sidePanel}>
            <InspectorPanel
              node={selectedNode}
              attachedScript={attachedScripts[selectedNode.id]}
              onClose={() => setSelectedId(null)}
              onDelete={() => { removeGraphNode(selectedNode.id); setSelectedId(null); }}
              onToggleBreakpoint={() => toggleBreakpoint(selectedNode.id)}
              onOpenScriptEditor={() => {
                setScriptEditorNodeId(selectedNode.id);
                setShowScriptEditor(true);
              }}
              onOpenRecordingPicker={() => {
                setScriptEditorNodeId(selectedNode.id);
                setShowRecordingPick(true);
              }}
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
            {logsToShow.slice(-50).map((l, i) => (
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
        {totalBreakpoints > 0 && (
          <>
            <Text style={styles.statusSep}>·</Text>
            <Text style={[styles.statusItem, { color: '#FF4081' }]}>{totalBreakpoints} BP</Text>
          </>
        )}
        {attachedCount > 0 && (
          <>
            <Text style={styles.statusSep}>·</Text>
            <Text style={[styles.statusItem, { color: '#F0DB4F' }]}>{attachedCount} scripts</Text>
          </>
        )}
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

      {/* Add Node Modal */}
      <AddNodeModal visible={showAdd} onAdd={(type) => {
        const def = NODE_DEFINITIONS.find(d => d.type === type);
        if (def) addGraphNode({ id: `n${Date.now()}`, type: type as NodeType, status: 'idle', label: def.label, config: {} });
      }} onClose={() => setShowAdd(false)} />

      {/* Script Editor Modal */}
      <ScriptEditorModal
        visible={showScriptEditor}
        nodeId={scriptEditorNodeId}
        nodeLabel={graphNodes.find(n => n.id === scriptEditorNodeId)?.label || scriptEditorNodeId}
        attached={attachedScripts[scriptEditorNodeId]}
        onSave={(s) => {
          setAttachedScripts(prev => ({ ...prev, [s.nodeId]: s }));
          addLog(`💾 حُفظ "${s.name}" (${s.lang}) في عقدة ${s.nodeId}`, 'ok');
          addNotification({ type: 'success', title: 'Script محفوظ', message: s.name, screen: 'graph' });
        }}
        onClose={() => setShowScriptEditor(false)}
      />

      {/* Recording Picker Modal */}
      <RecordingPickModal
        visible={showRecordingPick}
        nodeId={scriptEditorNodeId}
        nodeLabel={graphNodes.find(n => n.id === scriptEditorNodeId)?.label || scriptEditorNodeId}
        recordings={recordings || INITIAL_RECORDINGS}
        onAttach={(s) => {
          setAttachedScripts(prev => ({ ...prev, [s.nodeId]: s }));
          addLog(`🎙️ ربط Recording "${s.name}" → ${s.nodeId}`, 'ok');
          addNotification({ type: 'success', title: 'Recording مربوط', message: s.name, screen: 'graph' });
        }}
        onClose={() => setShowRecordingPick(false)}
      />
    </View>
  );
}

// ───────────────────────── STYLES ────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  headerTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  runningBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.running + '22', borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
  },
  runDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.running },
  runText: { color: Colors.running, fontSize: FontSize.xs, fontWeight: '600' },
  hBtn: { width: 28, height: 28, borderRadius: Radius.sm, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center' },
  hBtnActive: { backgroundColor: Colors.primaryDim },
  runBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.success, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 5,
  },
  runBtnStop: { backgroundColor: Colors.error },
  runBtnText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },

  bpCountBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#FF4081' + '20', borderRadius: Radius.full,
    paddingHorizontal: 5, paddingVertical: 2,
    borderWidth: 1, borderColor: '#FF4081' + '40',
  },
  bpCountText: { color: '#FF4081', fontSize: 9, fontWeight: '700' },
  scriptCountBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#F0DB4F' + '20', borderRadius: Radius.full,
    paddingHorizontal: 5, paddingVertical: 2,
    borderWidth: 1, borderColor: '#F0DB4F' + '40',
  },
  scriptCountText: { color: '#F0DB4F', fontSize: 9, fontWeight: '700' },

  progressWrap: {
    height: 28, backgroundColor: Colors.surface2, overflow: 'hidden',
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    justifyContent: 'center', position: 'relative',
  },
  progressBar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: Colors.primary + '30' },
  progressText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700', paddingHorizontal: Spacing.lg, zIndex: 1 },

  // Breakpoint panel
  bpPanel: {
    backgroundColor: '#FF4081' + '10', borderBottomWidth: 2, borderBottomColor: '#FF4081' + '60',
    borderTopWidth: 1, borderTopColor: '#FF4081' + '30',
  },
  bpPanelHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  bpPanelTitle: { color: '#FF4081', fontSize: FontSize.sm, fontWeight: '800' },
  bpPanelNode: { color: Colors.textMuted, fontSize: FontSize.xs, flex: 1, marginLeft: Spacing.xs },
  bpContextSection: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xs },
  bpContextLabel: { color: Colors.textDim, fontSize: FontSize.xs, fontWeight: '700', marginBottom: 4 },
  bpContextBox: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  bpContextEmpty: { color: Colors.textDim, fontSize: FontSize.xs },
  bpContextRow: {
    flexDirection: 'row', gap: 3, backgroundColor: Colors.surface2,
    borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2,
  },
  bpContextKey: { color: Colors.textDim, fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  bpContextVal: { color: Colors.textMuted, fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  bpActions: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, paddingTop: Spacing.xs,
  },
  bpActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    borderRadius: Radius.md, paddingVertical: Spacing.sm, borderWidth: 1,
  },
  bpActionText: { fontSize: FontSize.xs, fontWeight: '700' },

  body: { flex: 1, flexDirection: 'row' },
  sidePanel: { width: 265, borderLeftWidth: 1, borderLeftColor: Colors.border, backgroundColor: Colors.surface },
  pipeline: { flex: 1 },
  pipelineContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.xxl },

  pipelineTitle: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginBottom: Spacing.lg, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border + '50',
  },
  pipelineTitleText: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', flex: 1 },
  pipelineTitleCount: { color: Colors.textDim, fontSize: FontSize.xs },
  bpSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FF4081' + '15', borderRadius: Radius.full,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  bpSummaryText: { color: '#FF4081', fontSize: 9, fontWeight: '700' },
  scriptSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F0DB4F' + '15', borderRadius: Radius.full,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  scriptSummaryText: { color: '#F0DB4F', fontSize: 9, fontWeight: '700' },

  // Block styles
  block: {
    flexDirection: 'row', alignItems: 'stretch',
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', minHeight: 60,
    position: 'relative',
  },
  blockLoop: { borderRadius: Radius.md },
  blockSelected: { borderWidth: 1.5 },
  blockRunning: { borderColor: Colors.running + '70', backgroundColor: Colors.running + '06' },
  blockCompleted: { borderColor: Colors.completed + '50' },
  blockFailed: { borderColor: Colors.error + '70', backgroundColor: Colors.error + '05' },
  blockBreakpointHit: { borderColor: '#FF4081' + '90', backgroundColor: '#FF4081' + '08', borderWidth: 2 },

  bpDot: {
    position: 'absolute', top: 8, right: 8,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#FF4081' + '50',
    borderWidth: 1.5, borderColor: '#FF4081',
  },
  bpDotActive: { backgroundColor: '#FF4081' },
  bpBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#FF4081' + '20', borderRadius: Radius.full,
    paddingHorizontal: 4, paddingVertical: 1,
  },
  bpBadgeText: { color: '#FF4081', fontSize: 8, fontWeight: '800' },
  bpHitRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FF4081' + '15', borderRadius: Radius.sm,
    paddingHorizontal: Spacing.xs, paddingVertical: 2,
    marginTop: 2,
  },
  bpHitText: { color: '#FF4081', fontSize: FontSize.xs, fontWeight: '700' },

  blockLeft: { width: 34, alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  stepBadge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepNum: { fontSize: 9, fontWeight: '800' },
  statusBar: { width: 3, flex: 1, borderRadius: 2, marginBottom: Spacing.sm, opacity: 0.7 },
  blockIconWrap: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', margin: Spacing.sm, alignSelf: 'center' },
  blockBody: { flex: 1, paddingVertical: Spacing.md, paddingRight: Spacing.md, justifyContent: 'center' },
  blockTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 3, flexWrap: 'wrap' },
  blockLabel: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700', flex: 1 },
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

  // Script indicator
  scriptIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
    backgroundColor: '#F0DB4F' + '10', borderRadius: Radius.sm,
    marginBottom: 2, borderWidth: 1, borderColor: '#F0DB4F' + '20',
  },
  scriptIndicatorText: { fontSize: 9, fontWeight: '600', flex: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  // Connector
  connector: { alignItems: 'center', paddingVertical: 2 },
  connLine: { width: 1.5, height: 12, backgroundColor: Colors.border },
  edgeLabelWrap: {
    borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 1,
    borderWidth: 1, backgroundColor: Colors.surface2, marginBottom: 1,
  },
  edgeLabel: { fontSize: 9 },

  // Loop
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

  // Add block btn
  addBlockBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed',
    paddingVertical: Spacing.lg,
  },
  addBlockText: { color: Colors.textDim, fontSize: FontSize.sm },

  // Logs
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

  // Status bar
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
  inspName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700' },
  inspBtn: { width: 26, height: 26, borderRadius: Radius.sm, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center' },
  inspBody: { flex: 1 },
  inspSection: { gap: 6 },
  inspSectionTitle: { color: Colors.textDim, fontSize: FontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  inspDesc: { color: Colors.textMuted, fontSize: FontSize.sm, lineHeight: 20 },
  inspConfigRow: {
    flexDirection: 'row', gap: Spacing.sm,
    backgroundColor: Colors.surface2, borderRadius: Radius.sm, padding: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  inspConfigKey: { color: Colors.textDim, fontSize: FontSize.xs, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', minWidth: 55 },
  inspConfigVal: { color: Colors.textMuted, fontSize: FontSize.xs, flex: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  inspStatusBox: { borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },

  // Breakpoint toggle in inspector
  inspBpToggle: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.sm, borderRadius: Radius.md,
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
  },
  inspBpToggleActive: { backgroundColor: '#FF4081' + '15', borderColor: '#FF4081' + '50' },
  inspBpToggleText: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600', flex: 1 },
  inspBpDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4081' },

  // Attached script box
  attachedScriptBox: {
    backgroundColor: Colors.bg, borderRadius: Radius.md,
    padding: Spacing.sm, borderWidth: 1, gap: Spacing.xs,
  },
  attachedScriptTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  attachedScriptName: { flex: 1, fontSize: FontSize.xs, fontWeight: '700' },
  attachedLangPill: { borderRadius: Radius.full, paddingHorizontal: 5, paddingVertical: 1 },
  attachedLangText: { fontSize: 8, fontWeight: '700' },
  attachedScriptCode: {
    color: Colors.textMuted, fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 14,
  },
  attachedEditBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-end',
    backgroundColor: Colors.primaryDim, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
  },
  attachedEditText: { color: Colors.primary, fontSize: 9, fontWeight: '600' },

  // No script box
  noScriptBox: { gap: Spacing.xs },
  scriptAttachBtns: { flexDirection: 'row', gap: Spacing.xs },
  scriptAttachBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3,
    paddingVertical: Spacing.sm, borderRadius: Radius.md,
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
  },
  scriptAttachBtnText: { fontSize: 9, fontWeight: '700' },
  noScriptHint: { color: Colors.textDim, fontSize: 9, textAlign: 'center' },

  // Library quick panel
  libPanel: { flex: 1, backgroundColor: Colors.surface },
  libPanelHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  libPanelTitle: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700', flex: 1 },
  libTabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border },
  libTab: {
    flex: 1, paddingVertical: Spacing.sm, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  libTabActive: { borderBottomColor: Colors.primary },
  libTabText: { color: Colors.textDim, fontSize: FontSize.xs },
  libTabTextActive: { color: Colors.primary, fontWeight: '600' },
  libSearchRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.bg, margin: Spacing.xs,
    paddingHorizontal: Spacing.sm, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  libSearchInput: { flex: 1, color: Colors.text, fontSize: FontSize.xs, paddingVertical: 5 },
  libItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border + '30',
  },
  libItemName: { color: Colors.text, fontSize: FontSize.xs, fontWeight: '600' },
  libItemDesc: { color: Colors.textDim, fontSize: 9, marginTop: 1 },

  // Script Editor Modal
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000080' },
  modalBackdrop2: { flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' },
  scriptEditorModal: {
    backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl, maxHeight: '88%', gap: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  seHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  seTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  seNodeLabel: { color: Colors.textDim, fontSize: FontSize.xs, flex: 1 },
  seLangRow: { flexDirection: 'row', gap: Spacing.xs, paddingHorizontal: Spacing.lg },
  seLangBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: Spacing.sm, borderRadius: Radius.md,
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
  },
  seLangText: { color: Colors.textDim, fontSize: FontSize.xs },
  seNameInput: {
    marginHorizontal: Spacing.lg, backgroundColor: Colors.surface2,
    borderRadius: Radius.md, padding: Spacing.sm,
    color: Colors.text, fontSize: FontSize.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  seTemplateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginHorizontal: Spacing.lg, paddingVertical: 2,
  },
  seTemplateText: { color: Colors.accent, fontSize: FontSize.xs },
  seCodeWrap: {
    flex: 1, marginHorizontal: Spacing.lg, backgroundColor: Colors.bg,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    borderLeftWidth: 3, borderLeftColor: Colors.primary, overflow: 'hidden',
  },
  seCodeHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface2,
  },
  seLangDot: { width: 8, height: 8, borderRadius: 4 },
  seCodeLangLabel: { fontSize: FontSize.xs, fontWeight: '700' },
  seCodeScroll: { maxHeight: 260 },
  seCodeInput: {
    color: Colors.text, fontSize: FontSize.xs, lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    padding: Spacing.sm, minHeight: 180,
  },
  seActions: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg },
  seCancelBtn: {
    flex: 1, alignItems: 'center', padding: Spacing.md,
    backgroundColor: Colors.surface2, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
  },
  seCancelText: { color: Colors.textMuted, fontSize: FontSize.md },
  seSaveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.md,
  },
  seSaveText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },

  // Recording picker modal
  emptyRecording: { alignItems: 'center', paddingVertical: 48, gap: Spacing.sm },
  emptyRecordingText: { color: Colors.textMuted, fontSize: FontSize.lg, fontWeight: '700' },
  emptyRecordingSubText: { color: Colors.textDim, fontSize: FontSize.sm },

  // Add modal
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
