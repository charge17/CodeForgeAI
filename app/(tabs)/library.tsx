import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput, Modal, Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useApp';
import { Script, Selector, Recording } from '@/services/mockData';

type LibTab = 'scripts' | 'selectors' | 'recordings';

const SELECTOR_TYPE_COLOR: Record<string, string> = {
  input: Colors.primary, send: Colors.success, stop: Colors.error,
  response: '#7C4DFF', link: '#4F8EF7', button: Colors.warning, other: Colors.textDim,
};

const SELECTOR_TYPE_ICON: Record<string, string> = {
  input: 'form-textbox', send: 'send', stop: 'stop-circle',
  response: 'message-text', link: 'link', button: 'cursor-default-click', other: 'shape',
};

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const {
    addNotification, navigateToTab,
    scripts, setScripts,
    selectors, addSelectorToLibrary, deleteSelector,
    recordings,
    webViewBridge, isPipelineRunning,
  } = useApp();

  const [tab, setTab] = useState<LibTab>('selectors');
  const [search, setSearch] = useState('');
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [selectedSelector, setSelectedSelector] = useState<Selector | null>(null);
  const [scriptCat, setScriptCat] = useState('All');
  const [showAddSelector, setShowAddSelector] = useState(false);
  const [newSelName, setNewSelName] = useState('');
  const [newSelValue, setNewSelValue] = useState('');
  const [newSelType, setNewSelType] = useState<Selector['type']>('input');
  const [newSelSite, setNewSelSite] = useState('');

  const SCRIPT_CATS = ['All', ...Array.from(new Set(scripts.map(s => s.category)))];

  const filteredScripts = scripts.filter(s =>
    (scriptCat === 'All' || s.category === scriptCat) &&
    (!search || s.name.toLowerCase().includes(search.toLowerCase()) || s.description.includes(search))
  );

  const filteredSelectors = selectors.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.selector.includes(search)
  );

  const filteredRecordings = recordings.filter(r =>
    !search || r.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Test selector in browser ─────────────────────────────────
  const testSelectorInBrowser = useCallback((selector: string) => {
    if (webViewBridge) {
      webViewBridge.injectJS(`
        (function() {
          document.querySelectorAll('.forge-test-hl').forEach(function(e) {
            e.style.outline = '';
            e.classList.remove('forge-test-hl');
          });
          var els = document.querySelectorAll('${selector.replace(/'/g, "\\'")}');
          if (els.length > 0) {
            els.forEach(function(e) {
              e.style.outline = '3px solid #00E5FF';
              e.classList.add('forge-test-hl');
            });
            setTimeout(function() {
              els.forEach(function(e) { e.style.outline = ''; e.classList.remove('forge-test-hl'); });
            }, 3000);
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'selector_test_ok', selector: '${selector.replace(/'/g, "\\'")}', count: els.length
            }));
          } else {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'selector_test_fail', selector: '${selector.replace(/'/g, "\\'")}', count: 0
            }));
          }
        })();
      `);
      addNotification({ type: 'info', title: 'اختبار Selector', message: `نتيجة "${selector}" ستظهر في المتصفح`, screen: 'browser' });
      navigateToTab('browser');
    } else {
      addNotification({ type: 'warning', title: 'المتصفح غير جاهز', message: 'افتح شاشة المتصفح أولاً', screen: 'browser' });
    }
  }, [webViewBridge, addNotification, navigateToTab]);

  // ── Run script in browser ────────────────────────────────────
  const runScriptInBrowser = useCallback((script: Script) => {
    if (webViewBridge) {
      webViewBridge.injectJS(`(function() { ${script.code} })();`);
      addNotification({ type: 'success', title: 'تشغيل سكريبت', message: `"${script.name}" يعمل في المتصفح`, screen: 'browser' });
      navigateToTab('browser');
    } else {
      addNotification({ type: 'warning', title: 'المتصفح غير جاهز', message: 'افتح شاشة المتصفح أولاً', screen: 'browser' });
    }
  }, [webViewBridge, addNotification, navigateToTab]);

  // ── Add selector ─────────────────────────────────────────────
  const handleAddSelector = () => {
    if (!newSelValue.trim()) return;
    addSelectorToLibrary({
      name: newSelName.trim() || newSelValue.trim().substring(0, 30),
      selector: newSelValue.trim(),
      type: newSelType,
      site: newSelSite.trim() || undefined,
      alternatives: [],
    });
    setNewSelName(''); setNewSelValue(''); setNewSelSite(''); setNewSelType('input');
    setShowAddSelector(false);
    addNotification({ type: 'success', title: 'Selector مضاف', message: newSelValue.trim(), screen: 'library' });
  };

  // ── Copy to clipboard (simulate) ─────────────────────────────
  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    addNotification({ type: 'success', title: 'تم النسخ', message: text.substring(0, 50), screen: 'library' });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialCommunityIcons name="bookshelf" size={20} color={Colors.primary} />
        <Text style={styles.headerTitle}>المكتبة</Text>
        <View style={{ flex: 1 }} />
        <View style={styles.headerStats}>
          <Text style={styles.headerStat}>{scripts.length} سكريبت</Text>
          <Text style={styles.headerStatSep}>·</Text>
          <Text style={styles.headerStat}>{selectors.length} selector</Text>
          <Text style={styles.headerStatSep}>·</Text>
          <Text style={styles.headerStat}>{recordings.length} تسجيل</Text>
        </View>
        {webViewBridge && (
          <View style={styles.browserLive}>
            <View style={styles.browserLiveDot} />
            <Text style={styles.browserLiveText}>Browser متصل</Text>
          </View>
        )}
      </View>

      {/* Tab switcher */}
      <View style={styles.tabBar}>
        {([
          { key: 'selectors', label: 'Selectors', icon: 'crosshairs-gps', count: selectors.length },
          { key: 'scripts', label: 'سكريبتات', icon: 'code-braces', count: scripts.length },
          { key: 'recordings', label: 'تسجيلات', icon: 'record-circle', count: recordings.length },
        ] as { key: LibTab; label: string; icon: string; count: number }[]).map(t => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tabItem, tab === t.key && styles.tabItemActive]}>
            <MaterialCommunityIcons name={t.icon as any} size={15} color={tab === t.key ? Colors.primary : Colors.textDim} />
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
            <View style={[styles.tabCount, tab === t.key && styles.tabCountActive]}>
              <Text style={[styles.tabCountText, tab === t.key && { color: Colors.primary }]}>{t.count}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={15} color={Colors.textMuted} />
        <TextInput
          value={search} onChangeText={setSearch}
          placeholder="بحث..." placeholderTextColor={Colors.textDim}
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <MaterialCommunityIcons name="close-circle" size={15} color={Colors.textDim} />
          </Pressable>
        )}
      </View>

      {/* ── SELECTORS TAB ───────────────────────────────────────── */}
      {tab === 'selectors' && (
        <>
          <View style={styles.selectorTopBar}>
            <Text style={styles.selectorCount}>{filteredSelectors.length} selector</Text>
            <View style={styles.selectorTopActions}>
              <Pressable onPress={() => {
                navigateToTab('browser');
                addNotification({ type: 'info', title: 'Picker Mode', message: 'انقر على عنصر في المتصفح', screen: 'browser' });
              }} style={styles.pickerBtn}>
                <MaterialCommunityIcons name="crosshairs-gps" size={14} color={Colors.primary} />
                <Text style={styles.pickerBtnText}>Picker من Browser</Text>
              </Pressable>
              <Pressable onPress={() => setShowAddSelector(true)} style={styles.addSelectorBtn}>
                <MaterialCommunityIcons name="plus" size={14} color="#fff" />
                <Text style={styles.addSelectorBtnText}>إضافة</Text>
              </Pressable>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {filteredSelectors.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="crosshairs-gps" size={44} color={Colors.textDim} />
                <Text style={styles.emptyTitle}>لا يوجد Selectors</Text>
                <Text style={styles.emptyDesc}>استخدم Picker في المتصفح لحفظ Selectors تلقائياً</Text>
                <Pressable onPress={() => navigateToTab('browser')} style={styles.emptyBtn}>
                  <MaterialCommunityIcons name="web" size={15} color={Colors.primary} />
                  <Text style={styles.emptyBtnText}>فتح المتصفح</Text>
                </Pressable>
              </View>
            )}
            {filteredSelectors.map(item => {
              const typeColor = SELECTOR_TYPE_COLOR[item.type] || Colors.textDim;
              const typeIcon = SELECTOR_TYPE_ICON[item.type] || 'shape';
              return (
                <Pressable key={item.id} onPress={() => setSelectedSelector(item)}
                  style={({ pressed }) => [styles.selectorCard, pressed && styles.cardPressed]}>
                  {/* Type badge */}
                  <View style={[styles.selectorTypeWrap, { backgroundColor: typeColor + '15' }]}>
                    <MaterialCommunityIcons name={typeIcon as any} size={18} color={typeColor} />
                  </View>
                  <View style={styles.selectorInfo}>
                    <View style={styles.selectorNameRow}>
                      <Text style={styles.selectorName}>{item.name}</Text>
                      {item.site && (
                        <View style={styles.siteBadge}>
                          <Text style={styles.siteBadgeText}>{item.site}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.selectorCss} numberOfLines={1}>{item.selector}</Text>
                    {item.alternatives && item.alternatives.length > 0 && (
                      <Text style={styles.selectorAlts}>+{item.alternatives.length} بديل (Auto-Heal)</Text>
                    )}
                  </View>
                  <View style={[styles.selectorTypePill, { borderColor: typeColor + '60', backgroundColor: typeColor + '10' }]}>
                    <Text style={[styles.selectorTypePillText, { color: typeColor }]}>{item.type}</Text>
                  </View>
                  <View style={styles.selectorCardActions}>
                    <Pressable onPress={() => testSelectorInBrowser(item.selector)}
                      style={styles.selectorActionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <MaterialCommunityIcons name="test-tube" size={15} color={Colors.primary} />
                    </Pressable>
                    <Pressable onPress={() => copyToClipboard(item.selector)}
                      style={styles.selectorActionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <MaterialCommunityIcons name="content-copy" size={15} color={Colors.textDim} />
                    </Pressable>
                    <Pressable onPress={() => deleteSelector(item.id)}
                      style={styles.selectorActionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <MaterialCommunityIcons name="trash-can-outline" size={15} color={Colors.error + '80'} />
                    </Pressable>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* ── SCRIPTS TAB ──────────────────────────────────────────── */}
      {tab === 'scripts' && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={styles.catBar} contentContainerStyle={styles.catBarContent}>
            {SCRIPT_CATS.map(cat => (
              <Pressable key={cat} onPress={() => setScriptCat(cat)}
                style={[styles.catChip, scriptCat === cat && styles.catChipActive]}>
                <Text style={[styles.catChipText, scriptCat === cat && styles.catChipTextActive]}>{cat}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {filteredScripts.map(item => (
              <Pressable key={item.id} onPress={() => setSelectedScript(item)}
                style={({ pressed }) => [styles.scriptCard, pressed && styles.cardPressed]}>
                <View style={styles.scriptCardHeader}>
                  <View style={styles.scriptIcon}>
                    <MaterialCommunityIcons name="code-braces" size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.scriptInfo}>
                    <Text style={styles.scriptName}>{item.name}</Text>
                    <Text style={styles.scriptDesc}>{item.description}</Text>
                  </View>
                  <View style={styles.scriptCatBadge}>
                    <Text style={styles.scriptCatText}>{item.category}</Text>
                  </View>
                </View>
                <View style={styles.tagsRow}>
                  {item.tags.map(tag => (
                    <View key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
                  ))}
                </View>
                <View style={styles.codePreview}>
                  <Text style={styles.codePreviewText} numberOfLines={2}>{item.code}</Text>
                </View>
                <View style={styles.scriptActions}>
                  <Pressable onPress={() => runScriptInBrowser(item)} style={styles.scriptActionBtn}>
                    <MaterialCommunityIcons name="play-circle-outline" size={13} color={Colors.success} />
                    <Text style={[styles.scriptActionText, { color: Colors.success }]}>تشغيل في Browser</Text>
                  </Pressable>
                  <Pressable onPress={() => copyToClipboard(item.code)} style={styles.scriptActionBtn}>
                    <MaterialCommunityIcons name="content-copy" size={13} color={Colors.textDim} />
                    <Text style={styles.scriptActionText}>نسخ</Text>
                  </Pressable>
                  <Pressable onPress={() => addNotification({ type: 'success', title: 'تمت الإضافة', message: `"${item.name}" → Graph`, screen: 'graph' })} style={styles.scriptActionBtn}>
                    <MaterialCommunityIcons name="plus-circle-outline" size={13} color={Colors.primary} />
                    <Text style={[styles.scriptActionText, { color: Colors.primary }]}>Graph</Text>
                  </Pressable>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}

      {/* ── RECORDINGS TAB ───────────────────────────────────────── */}
      {tab === 'recordings' && (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {filteredRecordings.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="record-circle" size={44} color={Colors.textDim} />
              <Text style={styles.emptyTitle}>لا يوجد تسجيلات</Text>
              <Text style={styles.emptyDesc}>استخدم زر Record في المتصفح لتسجيل خطوات الأتمتة</Text>
              <Pressable onPress={() => navigateToTab('browser')} style={styles.emptyBtn}>
                <MaterialCommunityIcons name="record-circle" size={15} color={Colors.error} />
                <Text style={[styles.emptyBtnText, { color: Colors.error }]}>فتح المتصفح وبدء التسجيل</Text>
              </Pressable>
            </View>
          )}
          {filteredRecordings.map(item => (
            <Pressable key={item.id} onPress={() => setSelectedRecording(item)}
              style={({ pressed }) => [styles.recordingCard, pressed && styles.cardPressed]}>
              <View style={styles.recordingHeader}>
                <View style={styles.recIcon}>
                  <MaterialCommunityIcons name="record-circle" size={20} color={Colors.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recName}>{item.name}</Text>
                  <View style={styles.recMeta}>
                    <MaterialCommunityIcons name="format-list-numbered" size={11} color={Colors.textDim} />
                    <Text style={styles.recMetaText}>{item.steps.length} خطوة</Text>
                    <Text style={styles.recMetaDot}>·</Text>
                    <MaterialCommunityIcons name="clock" size={11} color={Colors.textDim} />
                    <Text style={styles.recMetaText}>{item.duration}</Text>
                    <Text style={styles.recMetaDot}>·</Text>
                    <Text style={styles.recMetaText}>{item.createdAt}</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textDim} />
              </View>
              <View style={styles.stepsPreview}>
                {item.steps.slice(0, 3).map((step, i) => (
                  <View key={i} style={styles.stepPreviewRow}>
                    <View style={styles.stepPreviewNum}>
                      <Text style={styles.stepPreviewNumText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.stepPreviewText} numberOfLines={1}>{step}</Text>
                  </View>
                ))}
                {item.steps.length > 3 && (
                  <Text style={styles.moreSteps}>+ {item.steps.length - 3} خطوة أخرى</Text>
                )}
              </View>
              <View style={styles.recActions}>
                <Pressable onPress={() => {
                  addNotification({ type: 'info', title: 'تشغيل التسجيل', message: item.name, screen: 'browser' });
                  navigateToTab('browser');
                }} style={styles.recActionBtn}>
                  <MaterialCommunityIcons name="play-circle" size={14} color={Colors.success} />
                  <Text style={[styles.recActionText, { color: Colors.success }]}>تشغيل في Browser</Text>
                </Pressable>
                <Pressable onPress={() => addNotification({ type: 'success', title: `"${item.name}" → Graph`, message: 'تحويل التسجيل لـ عقد Graph', screen: 'graph' })} style={styles.recActionBtn}>
                  <MaterialCommunityIcons name="sitemap" size={14} color={Colors.primary} />
                  <Text style={[styles.recActionText, { color: Colors.primary }]}>تحويل لـ Graph</Text>
                </Pressable>
                <Pressable onPress={() => copyToClipboard(item.steps.join('\n'))} style={styles.recActionBtn}>
                  <MaterialCommunityIcons name="content-copy" size={14} color={Colors.textDim} />
                  <Text style={styles.recActionText}>نسخ</Text>
                </Pressable>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* ── SELECTOR DETAIL MODAL ──────────────────────────────── */}
      <Modal visible={!!selectedSelector} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedSelector && (() => {
              const typeColor = SELECTOR_TYPE_COLOR[selectedSelector.type] || Colors.textDim;
              return (
                <>
                  <View style={styles.modalHeader}>
                    <View style={[styles.modalTypeIcon, { backgroundColor: typeColor + '20' }]}>
                      <MaterialCommunityIcons name={(SELECTOR_TYPE_ICON[selectedSelector.type] || 'shape') as any} size={20} color={typeColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalTitle}>{selectedSelector.name}</Text>
                      {selectedSelector.site && <Text style={styles.modalSite}>{selectedSelector.site}</Text>}
                    </View>
                    <Pressable onPress={() => setSelectedSelector(null)}>
                      <MaterialCommunityIcons name="close" size={22} color={Colors.textMuted} />
                    </Pressable>
                  </View>
                  <View style={styles.selectorDetailSection}>
                    <Text style={styles.selectorDetailLabel}>Selector الأساسي:</Text>
                    <Pressable onPress={() => copyToClipboard(selectedSelector.selector)} style={styles.selectorCodeBox}>
                      <Text style={styles.selectorCode}>{selectedSelector.selector}</Text>
                      <MaterialCommunityIcons name="content-copy" size={14} color={Colors.textDim} />
                    </Pressable>
                  </View>
                  {selectedSelector.alternatives && selectedSelector.alternatives.length > 0 && (
                    <View style={styles.selectorDetailSection}>
                      <Text style={styles.selectorDetailLabel}>بدائل (Auto-Heal fallback):</Text>
                      {selectedSelector.alternatives.map((alt, i) => (
                        <Pressable key={i} onPress={() => copyToClipboard(alt)} style={styles.altRow}>
                          <Text style={styles.altNum}>{i + 1}</Text>
                          <Text style={styles.altText}>{alt}</Text>
                          <MaterialCommunityIcons name="content-copy" size={12} color={Colors.textDim} />
                        </Pressable>
                      ))}
                    </View>
                  )}
                  <View style={styles.modalActions}>
                    <Pressable onPress={() => { testSelectorInBrowser(selectedSelector.selector); setSelectedSelector(null); }}
                      style={[styles.modalActionBtn, { backgroundColor: Colors.primaryDim }]}>
                      <MaterialCommunityIcons name="test-tube" size={16} color={Colors.primary} />
                      <Text style={[styles.modalActionText, { color: Colors.primary }]}>اختبار في Browser</Text>
                    </Pressable>
                    <Pressable onPress={() => { deleteSelector(selectedSelector.id); setSelectedSelector(null); }}
                      style={[styles.modalActionBtn, { backgroundColor: Colors.errorDim }]}>
                      <MaterialCommunityIcons name="trash-can-outline" size={16} color={Colors.error} />
                      <Text style={[styles.modalActionText, { color: Colors.error }]}>حذف</Text>
                    </Pressable>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ── SCRIPT DETAIL MODAL ────────────────────────────────── */}
      <Modal visible={!!selectedScript} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedScript && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.scriptIcon}>
                    <MaterialCommunityIcons name="code-braces" size={20} color={Colors.primary} />
                  </View>
                  <Text style={[styles.modalTitle, { flex: 1 }]}>{selectedScript.name}</Text>
                  <Pressable onPress={() => setSelectedScript(null)}>
                    <MaterialCommunityIcons name="close" size={22} color={Colors.textMuted} />
                  </Pressable>
                </View>
                <Text style={styles.modalDesc}>{selectedScript.description}</Text>
                <View style={styles.codeBlockWrap}>
                  <ScrollView>
                    <Text style={styles.codeBlockText}>{selectedScript.code}</Text>
                  </ScrollView>
                </View>
                <View style={styles.modalActions}>
                  <Pressable onPress={() => { runScriptInBrowser(selectedScript); setSelectedScript(null); }}
                    style={[styles.modalActionBtn, { backgroundColor: Colors.successDim }]}>
                    <MaterialCommunityIcons name="play-circle" size={16} color={Colors.success} />
                    <Text style={[styles.modalActionText, { color: Colors.success }]}>تشغيل في Browser</Text>
                  </Pressable>
                  <Pressable onPress={() => { copyToClipboard(selectedScript.code); setSelectedScript(null); }}
                    style={[styles.modalActionBtn, { backgroundColor: Colors.primaryDim }]}>
                    <MaterialCommunityIcons name="content-copy" size={16} color={Colors.primary} />
                    <Text style={[styles.modalActionText, { color: Colors.primary }]}>نسخ الكود</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── RECORDING DETAIL MODAL ─────────────────────────────── */}
      <Modal visible={!!selectedRecording} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedRecording && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.recIcon}>
                    <MaterialCommunityIcons name="record-circle" size={20} color={Colors.error} />
                  </View>
                  <Text style={[styles.modalTitle, { flex: 1 }]}>{selectedRecording.name}</Text>
                  <Pressable onPress={() => setSelectedRecording(null)}>
                    <MaterialCommunityIcons name="close" size={22} color={Colors.textMuted} />
                  </Pressable>
                </View>
                <View style={styles.recMeta}>
                  <Text style={styles.recMetaText}>{selectedRecording.steps.length} خطوة</Text>
                  <Text style={styles.recMetaDot}>·</Text>
                  <Text style={styles.recMetaText}>{selectedRecording.duration}</Text>
                </View>
                <ScrollView style={styles.stepsContainer} showsVerticalScrollIndicator={false}>
                  {selectedRecording.steps.map((step, i) => (
                    <View key={i} style={styles.stepRow}>
                      <View style={styles.stepNumBadge}><Text style={styles.stepNumBadgeText}>{i + 1}</Text></View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.modalActions}>
                  <Pressable onPress={() => {
                    addNotification({ type: 'info', title: 'تشغيل', message: selectedRecording.name, screen: 'browser' });
                    navigateToTab('browser');
                    setSelectedRecording(null);
                  }} style={[styles.modalActionBtn, { backgroundColor: Colors.successDim }]}>
                    <MaterialCommunityIcons name="play-circle" size={16} color={Colors.success} />
                    <Text style={[styles.modalActionText, { color: Colors.success }]}>تشغيل في Browser</Text>
                  </Pressable>
                  <Pressable onPress={() => {
                    addNotification({ type: 'success', title: 'تحويل لـ Graph', message: selectedRecording.name, screen: 'graph' });
                    setSelectedRecording(null);
                  }} style={[styles.modalActionBtn, { backgroundColor: Colors.primaryDim }]}>
                    <MaterialCommunityIcons name="sitemap" size={16} color={Colors.primary} />
                    <Text style={[styles.modalActionText, { color: Colors.primary }]}>تحويل لـ Graph</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── ADD SELECTOR MODAL ─────────────────────────────────── */}
      <Modal visible={showAddSelector} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>إضافة Selector يدوياً</Text>
              <Pressable onPress={() => setShowAddSelector(false)}>
                <MaterialCommunityIcons name="close" size={22} color={Colors.textMuted} />
              </Pressable>
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Selector (CSS) *</Text>
              <TextInput value={newSelValue} onChangeText={setNewSelValue}
                placeholder='button[aria-label="Send"]' placeholderTextColor={Colors.textDim}
                style={[styles.formInput, { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}
                autoCapitalize="none" autoCorrect={false} />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>الاسم (اختياري)</Text>
              <TextInput value={newSelName} onChangeText={setNewSelName}
                placeholder="زر الإرسال - DeepSeek" placeholderTextColor={Colors.textDim}
                style={styles.formInput} />
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>النوع</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
                {(['input', 'send', 'stop', 'response', 'button', 'link', 'other'] as Selector['type'][]).map(t => (
                  <Pressable key={t} onPress={() => setNewSelType(t)}
                    style={[styles.typeChip, newSelType === t && { backgroundColor: (SELECTOR_TYPE_COLOR[t] || Colors.textDim) + '25', borderColor: SELECTOR_TYPE_COLOR[t] || Colors.textDim }]}>
                    <MaterialCommunityIcons name={(SELECTOR_TYPE_ICON[t] || 'shape') as any} size={12} color={newSelType === t ? (SELECTOR_TYPE_COLOR[t] || Colors.textDim) : Colors.textDim} />
                    <Text style={[styles.typeChipText, newSelType === t && { color: SELECTOR_TYPE_COLOR[t] || Colors.textDim }]}>{t}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <View style={styles.formField}>
              <Text style={styles.formLabel}>الموقع (اختياري)</Text>
              <TextInput value={newSelSite} onChangeText={setNewSelSite}
                placeholder="chat.deepseek.com" placeholderTextColor={Colors.textDim}
                style={styles.formInput} autoCapitalize="none" keyboardType="url" />
            </View>
            <Pressable onPress={handleAddSelector}
              style={[styles.submitBtn, !newSelValue.trim() && styles.submitBtnDisabled]} disabled={!newSelValue.trim()}>
              <MaterialCommunityIcons name="plus" size={16} color="#fff" />
              <Text style={styles.submitBtnText}>إضافة Selector</Text>
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
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '700' },
  headerStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerStat: { color: Colors.textDim, fontSize: FontSize.xs },
  headerStatSep: { color: Colors.border, fontSize: FontSize.xs },
  browserLive: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.success + '20', borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.success + '40',
  },
  browserLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success },
  browserLiveText: { color: Colors.success, fontSize: 9, fontWeight: '700' },

  tabBar: { flexDirection: 'row', backgroundColor: Colors.surface2, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xs, paddingVertical: Spacing.md,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: Colors.primary },
  tabLabel: { color: Colors.textDim, fontSize: FontSize.xs },
  tabLabelActive: { color: Colors.primary, fontWeight: '600' },
  tabCount: { backgroundColor: Colors.surface3, borderRadius: Radius.full, paddingHorizontal: 5, paddingVertical: 1 },
  tabCountActive: { backgroundColor: Colors.primaryDim },
  tabCountText: { color: Colors.textDim, fontSize: 9 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.md },

  // Selectors
  selectorTopBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  selectorCount: { color: Colors.textDim, fontSize: FontSize.sm },
  selectorTopActions: { flexDirection: 'row', gap: Spacing.sm },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.primaryDim, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.primary + '50',
  },
  pickerBtnText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600' },
  addSelectorBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
  },
  addSelectorBtnText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '600' },

  selectorCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardPressed: { opacity: 0.88 },
  selectorTypeWrap: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  selectorInfo: { flex: 1, gap: 2 },
  selectorNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  selectorName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700' },
  siteBadge: { backgroundColor: Colors.surface2, borderRadius: Radius.full, paddingHorizontal: 5, paddingVertical: 1 },
  siteBadgeText: { color: Colors.textDim, fontSize: 9 },
  selectorCss: {
    color: Colors.primary, fontSize: FontSize.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  selectorAlts: { color: Colors.accent || Colors.primary, fontSize: 9, opacity: 0.8 },
  selectorTypePill: {
    paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: Radius.sm, borderWidth: 1,
  },
  selectorTypePillText: { fontSize: 9, fontWeight: '700' },
  selectorCardActions: { flexDirection: 'row', gap: Spacing.xs },
  selectorActionBtn: { padding: 4 },

  // Scripts
  catBar: { maxHeight: 38, backgroundColor: Colors.surface },
  catBarContent: { alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs },
  catChip: {
    paddingHorizontal: Spacing.md, paddingVertical: 5, borderRadius: Radius.full,
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
  },
  catChipActive: { backgroundColor: Colors.primaryDim, borderColor: Colors.primary },
  catChipText: { color: Colors.textMuted, fontSize: FontSize.xs },
  catChipTextActive: { color: Colors.primary, fontWeight: '600' },

  scriptCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm,
  },
  scriptCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  scriptIcon: {
    width: 36, height: 36, borderRadius: Radius.md,
    backgroundColor: Colors.primaryDim, alignItems: 'center', justifyContent: 'center',
  },
  scriptInfo: { flex: 1 },
  scriptName: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  scriptDesc: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  scriptCatBadge: { backgroundColor: Colors.surface2, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  scriptCatText: { color: Colors.textDim, fontSize: FontSize.xs },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  tag: {
    backgroundColor: Colors.surface3, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
    borderWidth: 1, borderColor: Colors.border,
  },
  tagText: { color: Colors.textDim, fontSize: 9 },
  codePreview: {
    backgroundColor: Colors.bg, borderRadius: Radius.sm, padding: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  codePreviewText: {
    color: Colors.textMuted, fontSize: FontSize.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 18,
  },
  scriptActions: {
    flexDirection: 'row', gap: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm,
  },
  scriptActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scriptActionText: { color: Colors.textDim, fontSize: FontSize.xs, fontWeight: '600' },

  // Recordings
  recordingCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm,
  },
  recordingHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  recIcon: {
    width: 40, height: 40, borderRadius: Radius.md,
    backgroundColor: Colors.errorDim, alignItems: 'center', justifyContent: 'center',
  },
  recName: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  recMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: 2 },
  recMetaText: { color: Colors.textDim, fontSize: FontSize.xs },
  recMetaDot: { color: Colors.textDim, fontSize: FontSize.xs },
  stepsPreview: { backgroundColor: Colors.bg, borderRadius: Radius.sm, padding: Spacing.sm, gap: 4 },
  stepPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  stepPreviewNum: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.surface3,
    alignItems: 'center', justifyContent: 'center',
  },
  stepPreviewNumText: { color: Colors.textDim, fontSize: 9, fontWeight: '700' },
  stepPreviewText: {
    color: Colors.textMuted, fontSize: FontSize.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', flex: 1,
  },
  moreSteps: { color: Colors.textDim, fontSize: FontSize.xs, marginTop: 2, paddingLeft: 22 },
  recActions: {
    flexDirection: 'row', gap: Spacing.lg,
    borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm,
  },
  recActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recActionText: { color: Colors.textDim, fontSize: FontSize.xs, fontWeight: '600' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: Spacing.md },
  emptyTitle: { color: Colors.textMuted, fontSize: FontSize.xl, fontWeight: '700' },
  emptyDesc: { color: Colors.textDim, fontSize: FontSize.sm, textAlign: 'center', paddingHorizontal: Spacing.xl },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primaryDim, borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary + '50', marginTop: Spacing.sm,
  },
  emptyBtnText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl, padding: Spacing.xl, maxHeight: '82%', gap: Spacing.lg,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  modalTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '700' },
  modalSite: { color: Colors.textDim, fontSize: FontSize.xs, marginTop: 2 },
  modalDesc: { color: Colors.textMuted, fontSize: FontSize.md },
  modalTypeIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  selectorDetailSection: { gap: Spacing.sm },
  selectorDetailLabel: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '600' },
  selectorCodeBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.bg, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary + '40', borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  selectorCode: {
    flex: 1, color: Colors.primary, fontSize: FontSize.sm,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  altRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface2, borderRadius: Radius.sm, padding: Spacing.sm,
  },
  altNum: { color: Colors.textDim, fontSize: FontSize.xs, width: 16 },
  altText: {
    flex: 1, color: Colors.textMuted, fontSize: FontSize.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  codeBlockWrap: {
    backgroundColor: Colors.bg, borderRadius: Radius.md, padding: Spacing.lg,
    maxHeight: 220, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  codeBlockText: {
    color: Colors.text, fontSize: FontSize.sm,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 20,
  },
  stepsContainer: { maxHeight: 280 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.sm },
  stepNumBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.primaryDim, alignItems: 'center', justifyContent: 'center',
  },
  stepNumBadgeText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700' },
  stepText: {
    flex: 1, color: Colors.textMuted, fontSize: FontSize.sm,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 20,
  },
  modalActions: { flexDirection: 'row', gap: Spacing.md },
  modalActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs,
    backgroundColor: Colors.surface2, borderRadius: Radius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  modalActionText: { color: Colors.textMuted, fontSize: FontSize.md, fontWeight: '600' },

  // Add selector form
  formField: { gap: 5 },
  formLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' },
  formInput: {
    backgroundColor: Colors.surface2, borderRadius: Radius.md, padding: Spacing.md,
    color: Colors.text, fontSize: FontSize.sm, borderWidth: 1, borderColor: Colors.border,
  },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm, paddingVertical: 5,
    borderRadius: Radius.full, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border,
  },
  typeChipText: { color: Colors.textDim, fontSize: FontSize.xs },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.lg,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  listContent: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: 80 },
});
