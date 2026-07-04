import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput, Platform, Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useApp';

const PRESETS = [
  { name: 'DeepSeek', url: 'https://chat.deepseek.com', icon: 'brain', color: '#4080FF' },
  { name: 'ChatGPT', url: 'https://chatgpt.com', icon: 'robot', color: '#10A37F' },
  { name: 'Gemini', url: 'https://gemini.google.com', icon: 'google', color: '#4285F4' },
  { name: 'Claude', url: 'https://claude.ai', icon: 'lightning-bolt', color: '#D97757' },
  { name: 'Grok', url: 'https://grok.com', icon: 'atom-variant', color: '#1DA1F2' },
];

type ToolMode = 'none' | 'picker' | 'console';

export default function BrowserScreen() {
  const insets = useSafeAreaInsets();
  const {
    browserUrl, setBrowserUrl,
    browserTabs, activeTabId, addBrowserTab, setActiveTabId,
    watchdogActive, setWatchdogActive,
    addNotification,
    registerWebViewBridge,
    addFilesFromExtraction,
    addTasksFromJson,
    setLastBrowserEvent,
    isPipelineRunning,
    addSelectorToLibrary,
    addRecordingToLibrary,
    headlessMode, setHeadlessMode,
  } = useApp();

  const [urlInput, setUrlInput] = useState(browserUrl);
  const [toolMode, setToolMode] = useState<ToolMode>('none');
  const [consoleLogs, setConsoleLogs] = useState<{ type: string; msg: string }[]>([
    { type: 'info', msg: '🌐 Browser ready — Pipeline integration active' },
  ]);
  const [recording, setRecording] = useState(false);
  const [recordedSteps, setRecordedSteps] = useState<string[]>([]);
  const [pickerActive, setPickerActive] = useState(false);
  const [selectedSelectors, setSelectedSelectors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [waitPanel, setWaitPanel] = useState(false);
  const [waitSelector, setWaitSelector] = useState("button[aria-label='Stop']");
  const [waitActive, setWaitActive] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [headlessLogs, setHeadlessLogs] = useState<{ time: string; type: string; msg: string }[]>([]);
  const headlessCursorAnim = useRef(new Animated.Value(1)).current;
  const [pageTitle, setPageTitle] = useState('');
  const headerAnim = useRef(new Animated.Value(1)).current;

  const webViewRef = useRef<WebView>(null);
  const lastUrlRef = useRef(browserUrl);

  // ── Headless cursor blink ─────────────────────────────────────
  useEffect(() => {
    if (headlessMode) {
      const blink = Animated.loop(
        Animated.sequence([
          Animated.timing(headlessCursorAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
          Animated.timing(headlessCursorAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      blink.start();
      return () => blink.stop();
    }
  }, [headlessMode]);

  const addHeadlessLog = useCallback((type: string, msg: string) => {
    const now = new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setHeadlessLogs(prev => [...prev.slice(-200), { time: now, type, msg }]);
  }, []);

  // ── Toggle header ─────────────────────────────────────────────
  const toggleHeader = () => {
    const toValue = headerVisible ? 0 : 1;
    Animated.timing(headerAnim, { toValue, duration: 200, useNativeDriver: false }).start();
    setHeaderVisible(!headerVisible);
  };

  const headerHeight = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 86] });
  const headerOpacity = headerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  // ── Register bridge ───────────────────────────────────────────
  useEffect(() => {
    registerWebViewBridge({
      navigate: (url: string) => {
        let finalUrl = url;
        if (!finalUrl.startsWith('http')) finalUrl = 'https://' + finalUrl;
        lastUrlRef.current = finalUrl;
        setBrowserUrl(finalUrl);
        setUrlInput(finalUrl);
      },
      injectJS: (script: string) => {
        const s = script.endsWith('true;') ? script : script + ' true;';
        webViewRef.current?.injectJavaScript(s);
      },
      getCurrentUrl: () => lastUrlRef.current,
    });
  }, []);

  // ── Sync URL input when pipeline changes browserUrl ─────────
  useEffect(() => {
    if (browserUrl !== lastUrlRef.current) {
      lastUrlRef.current = browserUrl;
      setUrlInput(browserUrl);
    }
  }, [browserUrl]);

  const addLog = useCallback((log: { type: string; msg: string }) => {
    setConsoleLogs(prev => [...prev.slice(-150), log]);
    // Mirror to headless logs when active
    if (headlessMode) addHeadlessLog(log.type, log.msg);
  }, [headlessMode, addHeadlessLog]);

  const navigate = (url: string) => {
    let finalUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) finalUrl = 'https://' + url;
    lastUrlRef.current = finalUrl;
    setBrowserUrl(finalUrl);
    setUrlInput(finalUrl);
    if (recording) setRecordedSteps(prev => [...prev, `انتقل إلى: ${finalUrl}`]);
  };

  const injectPickerScript = () => {
    const script = `
      (function() {
        if (document.getElementById('forge-picker-ov')) return;
        var ov = document.createElement('div');
        ov.id = 'forge-picker-ov';
        ov.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483647;cursor:crosshair;';
        document.body.appendChild(ov);
        var hlEl = null;
        ov.addEventListener('mousemove', function(e) {
          ov.style.pointerEvents = 'none';
          var el = document.elementFromPoint(e.clientX, e.clientY);
          ov.style.pointerEvents = '';
          if (hlEl && hlEl !== el) { hlEl.style.outline = ''; }
          if (el && el !== ov) { el.style.outline = '2px dashed #4F8EF7'; hlEl = el; }
        });
        ov.addEventListener('click', function(e) {
          e.preventDefault(); e.stopPropagation();
          ov.style.pointerEvents = 'none';
          var el = document.elementFromPoint(e.clientX, e.clientY);
          if (hlEl) hlEl.style.outline = '';
          if (el && el !== ov) {
            var parts = [];
            if (el.id) parts.push('#' + el.id);
            if (el.getAttribute('data-testid')) parts.push('[data-testid="' + el.getAttribute('data-testid') + '"]');
            if (el.getAttribute('aria-label')) parts.push('[aria-label="' + el.getAttribute('aria-label') + '"]');
            var classVal = el.className && typeof el.className === 'string' ? el.className.trim().split(/\\s+/).filter(Boolean)[0] : '';
            if (classVal) parts.push(el.tagName.toLowerCase() + '.' + classVal);
            var sel = parts[0] || el.tagName.toLowerCase();
            var type = el.tagName === 'BUTTON' ? 'button'
              : el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ? 'input'
              : el.tagName === 'A' ? 'link' : 'other';
            var text = (el.innerText || el.textContent || '').trim().substring(0, 30);
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'selector',
              value: sel,
              elementType: type,
              text: text,
              allSelectors: parts,
              tag: el.tagName.toLowerCase(),
              url: location.href,
            }));
          }
          if (document.body.contains(ov)) document.body.removeChild(ov);
        });
        document.addEventListener('keydown', function esc(e) {
          if (e.key === 'Escape') {
            if (hlEl) hlEl.style.outline = '';
            if (document.body.contains(ov)) document.body.removeChild(ov);
            document.removeEventListener('keydown', esc);
          }
        });
      })();
    `;
    webViewRef.current?.injectJavaScript(script + ' true;');
  };

  const injectWaitDisappear = (selector: string, timeoutMs = 60000) => {
    const esc = selector.replace(/"/g, '\\"').replace(/'/g, "\\'");
    const script = `
      (function() {
        var SEL = "${esc}", TIMEOUT = ${timeoutMs}, start = Date.now();
        function gone() {
          var els = document.querySelectorAll(SEL);
          return els.length === 0 || Array.from(els).every(function(e) {
            return e.offsetParent===null || getComputedStyle(e).display==='none' || getComputedStyle(e).visibility==='hidden';
          });
        }
        if (gone()) { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:'wait_disappear_done',selector:SEL,elapsed:0})); return; }
        var obs = new MutationObserver(function() {
          if (gone()) { obs.disconnect(); clearTimeout(tmo); clearInterval(poll);
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:'wait_disappear_done',selector:SEL,elapsed:Date.now()-start})); }
        });
        obs.observe(document.body,{childList:true,subtree:true,attributes:true});
        var poll = setInterval(function() { if (gone()) { clearInterval(poll); obs.disconnect(); clearTimeout(tmo);
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:'wait_disappear_done',selector:SEL,elapsed:Date.now()-start})); }},500);
        var tmo = setTimeout(function() { clearInterval(poll); obs.disconnect();
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:'wait_disappear_timeout',selector:SEL})); },TIMEOUT);
      })();
    `;
    webViewRef.current?.injectJavaScript(script + ' true;');
    addLog({ type: 'info', msg: `WaitDisappear: "${selector}"` });
  };

  // ── Handle WebView messages ───────────────────────────────────
  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      setLastBrowserEvent({ type: data.type, payload: data });

      if (data.type === 'selector') {
        const sel = data.value;
        setSelectedSelectors(prev => [...prev, sel]);
        addLog({ type: 'success', msg: `✓ Selector: ${sel}` });
        setPickerActive(false);
        // Save to library
        addSelectorToLibrary({
          name: data.text ? `${data.text.substring(0, 20)}...` : sel,
          selector: sel,
          type: data.elementType || 'other',
          site: data.url ? new URL(data.url).hostname : undefined,
          alternatives: data.allSelectors?.filter((s: string) => s !== sel) || [],
        });
        addNotification({ type: 'success', title: 'Selector محفوظ في المكتبة', message: sel, screen: 'library' });
      }
      if (data.type === 'wait_disappear_done') {
        const secs = ((data.elapsed || 0) / 1000).toFixed(1);
        addLog({ type: 'success', msg: `✓ WaitDisappear: اختفى بعد ${secs}s` });
        setWaitActive(false);
        addNotification({ type: 'success', title: 'Wait Disappear ✓', message: `اختفى بعد ${secs}s`, screen: 'graph' });
      }
      if (data.type === 'wait_disappear_timeout') {
        addLog({ type: 'error', msg: `✗ WaitDisappear: timeout` });
        setWaitActive(false);
      }
      if (data.type === 'files_extracted') {
        const fs = data.files || [];
        if (fs.length > 0) {
          addFilesFromExtraction(fs);
          addLog({ type: 'success', msg: `✓ ${fs.length} ملف → Workspace` });
          addNotification({ type: 'success', title: `${fs.length} ملفات في Workspace`, message: data.taskTitle || '', screen: 'workspace' });
        } else {
          addLog({ type: 'warn', msg: '⚠ لم يتم العثور على كتل أكواد' });
        }
      }
      if (data.type === 'tasks_extracted') {
        const tasks = data.tasks || [];
        if (tasks.length > 0) {
          addTasksFromJson(tasks);
          addLog({ type: 'success', msg: `✓ ${tasks.length} مهمة → Tasks` });
        }
      }
      if (data.type === 'inject_done') { addLog({ type: 'success', msg: `✓ Inject: ${data.field}` }); if (headlessMode) addHeadlessLog('success', `DOM: حقن نجح → ${data.field}`); }
      if (data.type === 'inject_error') { addLog({ type: 'error', msg: `✗ Inject Error: ${data.msg}` }); if (headlessMode) addHeadlessLog('error', `DOM Error: ${data.msg}`); }
      if (data.type === 'click_done') { addLog({ type: 'success', msg: `✓ Click: ${data.element}` }); if (headlessMode) addHeadlessLog('success', `Click → ${data.element}`); }
      if (data.type === 'click_error') { addLog({ type: 'error', msg: `✗ Click Error: ${data.msg}` }); if (headlessMode) addHeadlessLog('error', `Click Error: ${data.msg}`); }
      if (data.type === 'watchdog_complete') {
        addLog({ type: 'success', msg: `✓ Watchdog: رد AI مكتمل` });
        setWatchdogActive(false);
        addNotification({ type: 'success', title: 'رد AI مكتمل', message: data.content?.substring(0, 60) || '', screen: 'graph' });
      }
    } catch { }
  }, [setLastBrowserEvent, addFilesFromExtraction, addTasksFromJson, addNotification, addLog, addSelectorToLibrary]);

  const logColor = (type: string) => {
    if (type === 'error') return Colors.error;
    if (type === 'success') return Colors.success;
    if (type === 'warn') return Colors.warning;
    return Colors.textMuted;
  };

  const logIcon = (type: string) => {
    if (type === 'error') return '✗';
    if (type === 'success') return '✓';
    if (type === 'warn') return '⚠';
    return '›';
  };

  const currentHost = (() => {
    try { return new URL(browserUrl).hostname.replace('www.', ''); } catch { return browserUrl; }
  })();

  const headlessLogColor = (type: string) => {
    if (type === 'error') return Colors.error;
    if (type === 'success') return Colors.success;
    if (type === 'warn') return Colors.warning;
    if (type === 'info') return Colors.primary;
    return Colors.textMuted;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Pipeline control banner */}
      {isPipelineRunning && (
        <View style={styles.pipelineBanner}>
          <View style={styles.pipelineDot} />
          <Text style={styles.pipelineText}>⚙️ Pipeline يتحكم في المتصفح تلقائياً</Text>
          <MaterialCommunityIcons name="cog" size={14} color={Colors.warning} />
        </View>
      )}

      {/* Compact URL bar (always visible) */}
      <View style={styles.compactBar}>
        <Pressable onPress={toggleHeader} style={styles.compactToggle} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <MaterialCommunityIcons name={headerVisible ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textDim} />
        </Pressable>
        <View style={styles.compactUrlWrap}>
          <MaterialCommunityIcons name="lock" size={10} color={Colors.success} />
          <Text style={styles.compactUrl} numberOfLines={1}>{pageTitle || currentHost}</Text>
        </View>
        {isLoading && <View style={styles.loadingDotSm} />}
        {headlessMode && (
          <View style={styles.headlessBadge}>
            <MaterialCommunityIcons name="eye-off-outline" size={10} color={Colors.accent} />
            <Text style={styles.headlessBadgeText}>Headless</Text>
          </View>
        )}
        <Pressable onPress={() => webViewRef.current?.reload()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name={isLoading ? 'close' : 'refresh'} size={16} color={Colors.textMuted} />
        </Pressable>
      </View>

      {/* Collapsible header (tabs + url + presets) */}
      <Animated.View style={[styles.collapsibleHeader, { height: headerHeight, opacity: headerOpacity, overflow: 'hidden' }]}>
        {/* Tabs */}
        <View style={styles.tabsBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
            {browserTabs.map(tab => (
              <Pressable
                key={tab.id}
                onPress={() => {
                  setActiveTabId(tab.id);
                  if (tab.url) { setBrowserUrl(tab.url); setUrlInput(tab.url); lastUrlRef.current = tab.url; }
                }}
                style={[styles.tab, activeTabId === tab.id && styles.tabActive]}
              >
                <MaterialCommunityIcons name="web" size={11} color={activeTabId === tab.id ? Colors.primary : Colors.textDim} />
                <Text style={[styles.tabTitle, activeTabId === tab.id && styles.tabTitleActive]} numberOfLines={1}>
                  {tab.title || 'New Tab'}
                </Text>
                {isLoading && activeTabId === tab.id && <View style={styles.loadingDot} />}
              </Pressable>
            ))}
            <Pressable onPress={() => addBrowserTab('https://google.com')} style={styles.newTabBtn}>
              <MaterialCommunityIcons name="plus" size={16} color={Colors.textDim} />
            </Pressable>
          </ScrollView>
        </View>

        {/* URL bar */}
        <View style={styles.urlBar}>
          <Pressable onPress={() => webViewRef.current?.goBack()} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="arrow-left" size={18} color={Colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => webViewRef.current?.goForward()} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons name="arrow-right" size={18} color={Colors.textMuted} />
          </Pressable>
          <View style={styles.urlInputWrap}>
            <MaterialCommunityIcons name="lock" size={11} color={Colors.success} />
            <TextInput
              value={urlInput}
              onChangeText={setUrlInput}
              onSubmitEditing={() => navigate(urlInput)}
              style={styles.urlInput}
              placeholderTextColor={Colors.textDim}
              placeholder="أدخل عنوان URL..."
              autoCapitalize="none" autoCorrect={false}
              keyboardType="url" returnKeyType="go"
            />
            {urlInput.length > 0 && (
              <Pressable onPress={() => setUrlInput('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="close-circle" size={14} color={Colors.textDim} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Presets row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presets} contentContainerStyle={styles.presetsContent}>
          {PRESETS.map(p => (
            <Pressable key={p.url} onPress={() => navigate(p.url)} style={[styles.preset, browserUrl.includes(p.url.split('//')[1]) && { borderColor: p.color + '80' }]}>
              <MaterialCommunityIcons name={p.icon as any} size={13} color={p.color} />
              <Text style={[styles.presetLabel, { color: p.color }]}>{p.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Loading bar */}
      {isLoading && (
        <View style={styles.loadingBar}>
          <View style={styles.loadingFill} />
        </View>
      )}

      {/* Headless terminal UI */}
      {headlessMode && (
        <View style={styles.headlessTerminal}>
          <View style={styles.headlessHeader}>
            <View style={styles.headlessTrafficLights}>
              <View style={[styles.headlessLight, { backgroundColor: '#FF5F57' }]} />
              <View style={[styles.headlessLight, { backgroundColor: '#FEBC2E' }]} />
              <View style={[styles.headlessLight, { backgroundColor: '#28C840' }]} />
            </View>
            <MaterialCommunityIcons name="eye-off-outline" size={13} color={Colors.accent} />
            <Text style={styles.headlessTermTitle}>Headless Browser — {currentHost}</Text>
            <View style={{ flex: 1 }} />
            {isLoading && (
              <View style={styles.headlessLoadingBadge}>
                <Animated.View style={[styles.headlessLoadingDot, { opacity: headlessCursorAnim }]} />
                <Text style={styles.headlessLoadingText}>Loading...</Text>
              </View>
            )}
            <Pressable onPress={() => setHeadlessLogs([])} style={styles.headlessClearBtn}>
              <MaterialCommunityIcons name="trash-can-outline" size={13} color={Colors.textDim} />
            </Pressable>
          </View>
          <View style={styles.headlessUrlBar}>
            <MaterialCommunityIcons name="link-variant" size={11} color={Colors.textDim} />
            <Text style={styles.headlessUrl} numberOfLines={1}>{browserUrl}</Text>
            <View style={[styles.headlessStatusBadge, { backgroundColor: isLoading ? Colors.warning + '20' : Colors.success + '20' }]}>
              <Text style={[styles.headlessStatusText, { color: isLoading ? Colors.warning : Colors.success }]}>
                {isLoading ? '⟳ Loading' : '✓ Ready'}
              </Text>
            </View>
          </View>
          {isPipelineRunning && (
            <View style={styles.headlessPipelineBar}>
              <Animated.View style={[styles.headlessPipelineDot, { opacity: headlessCursorAnim }]} />
              <Text style={styles.headlessPipelineText}>⚙️ Pipeline نشط — يتحكم في المتصفح تلقائياً</Text>
            </View>
          )}
          <ScrollView style={styles.headlessLogScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.headlessPrompt}>
              {'CodeForgeAI Headless Browser v3.0\nPowered by React Native WebView\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'}
            </Text>
            {headlessLogs.map((l, i) => (
              <View key={i} style={styles.headlessLogRow}>
                <Text style={styles.headlessLogTime}>[{l.time}]</Text>
                <Text style={[styles.headlessLogIcon, { color: headlessLogColor(l.type) }]}>
                  {l.type === 'error' ? '✗' : l.type === 'success' ? '✓' : l.type === 'warn' ? '⚠' : '›'}
                </Text>
                <Text style={[styles.headlessLogMsg, { color: headlessLogColor(l.type) }]}>{l.msg}</Text>
              </View>
            ))}
            {headlessLogs.length === 0 && (
              <Text style={styles.headlessEmpty}>
                {'# المتصفح يعمل في الخلفية\n# سيظهر السجل هنا فور بدء النشاط\n# شغّل Pipeline من Auto Dev أو Graph\n'}
              </Text>
            )}
            <View style={styles.headlessCursorRow}>
              <Text style={styles.headlessPromptChar}>$ </Text>
              <Animated.View style={[styles.headlessCursor, { opacity: headlessCursorAnim }]} />
            </View>
          </ScrollView>
          <View style={styles.headlessControls}>
            <Pressable onPress={() => navigate(urlInput || browserUrl)} style={styles.headlessControlBtn}>
              <MaterialCommunityIcons name="refresh" size={14} color={Colors.textMuted} />
              <Text style={styles.headlessControlText}>Reload</Text>
            </Pressable>
            <Pressable onPress={() => addHeadlessLog('info', '📸 Screenshot captured')} style={styles.headlessControlBtn}>
              <MaterialCommunityIcons name="camera" size={14} color={Colors.textMuted} />
              <Text style={styles.headlessControlText}>Screenshot</Text>
            </Pressable>
            <Pressable onPress={() => {
              webViewRef.current?.injectJavaScript(`window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'inject_done', field: 'DOM check: ' + document.querySelectorAll('*').length + ' elements, title: ' + document.title })); true;`);
              addHeadlessLog('info', 'فحص DOM...');
            }} style={styles.headlessControlBtn}>
              <MaterialCommunityIcons name="code-tags" size={14} color={Colors.textMuted} />
              <Text style={styles.headlessControlText}>Inspect</Text>
            </Pressable>
            <Pressable onPress={() => setHeadlessMode(false)} style={[styles.headlessControlBtn, { backgroundColor: Colors.errorDim }]}>
              <MaterialCommunityIcons name="eye" size={14} color={Colors.error} />
              <Text style={[styles.headlessControlText, { color: Colors.error }]}>Show</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* WebView — always mounted, hidden in headless mode so automation keeps working */}
      <View style={[styles.webViewWrap, headlessMode && styles.webViewHidden]}>
        <WebView
          ref={webViewRef}
          source={{ uri: browserUrl }}
          style={styles.webview}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mixedContentMode="always"
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          allowsBackForwardNavigationGestures
          userAgent="Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
          onLoadStart={() => {
            setIsLoading(true);
            addLog({ type: 'info', msg: `Loading: ${browserUrl}` });
            if (headlessMode) addHeadlessLog('info', `⟳ فتح: ${browserUrl}`);
          }}
          onLoadEnd={() => {
            setIsLoading(false);
            addLog({ type: 'success', msg: `✓ Loaded: ${browserUrl}` });
            if (headlessMode) addHeadlessLog('success', `✓ تحمّلت: ${browserUrl}`);
          }}
          onError={(e) => {
            setIsLoading(false);
            addLog({ type: 'error', msg: `✗ Error: ${e.nativeEvent.description}` });
          }}
          onNavigationStateChange={(state) => {
            if (state.url && !state.loading) {
              lastUrlRef.current = state.url;
              setUrlInput(state.url);
              setBrowserUrl(state.url);
            }
            if (state.title) setPageTitle(state.title);
          }}
        />
        {pickerActive && (
          <View style={styles.pickerOverlay} pointerEvents="none">
            <View style={styles.pickerHint}>
              <MaterialCommunityIcons name="crosshairs-gps" size={18} color={Colors.primary} />
              <Text style={styles.pickerHintText}>انقر على عنصر لحفظ Selector</Text>
            </View>
          </View>
        )}
      </View>

      {/* Wait Disappear panel */}
      {waitPanel && (
        <View style={styles.waitPanel}>
          <View style={styles.waitPanelRow}>
            <MaterialCommunityIcons name="eye-off" size={14} color={Colors.warning} />
            <Text style={styles.waitPanelTitle}>Wait Disappear</Text>
            <Pressable onPress={() => setWaitPanel(false)} style={{ marginLeft: 'auto' as any }}>
              <MaterialCommunityIcons name="close" size={14} color={Colors.textDim} />
            </Pressable>
          </View>
          <View style={styles.waitInputRow}>
            <TextInput
              value={waitSelector} onChangeText={setWaitSelector}
              style={styles.waitInput} placeholder="button[aria-label='Stop']"
              placeholderTextColor={Colors.textDim} autoCapitalize="none"
            />
            <Pressable
              onPress={() => { setWaitActive(true); injectWaitDisappear(waitSelector); }}
              disabled={waitActive}
              style={[styles.waitRunBtn, waitActive && styles.waitRunBtnActive]}
            >
              <MaterialCommunityIcons name={waitActive ? 'loading' : 'play'} size={14} color={waitActive ? Colors.warning : '#fff'} />
              <Text style={[styles.waitRunBtnText, waitActive && { color: Colors.warning }]}>
                {waitActive ? 'يراقب...' : 'تشغيل'}
              </Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.xs, paddingVertical: 2 }}>
            {["button[aria-label='Stop']", 'button[data-testid="send-button"]', '.loading-spinner', '.streaming-indicator'].map(s => (
              <Pressable key={s} onPress={() => setWaitSelector(s)}
                style={[styles.waitPreset, waitSelector === s && styles.waitPresetActive]}>
                <Text style={[styles.waitPresetText, waitSelector === s && { color: Colors.warning }]} numberOfLines={1}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Toolbar */}
      <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom - 60, Spacing.sm) }]}>
        <Pressable
          onPress={() => {
            const next = !pickerActive;
            setPickerActive(next);
            setToolMode(next ? 'picker' : 'none');
            if (next) injectPickerScript();
          }}
          style={[styles.toolBtn, toolMode === 'picker' && styles.toolBtnActive]}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={18} color={toolMode === 'picker' ? Colors.primary : Colors.textMuted} />
          <Text style={[styles.toolLabel, toolMode === 'picker' && styles.toolLabelActive]}>Picker</Text>
        </Pressable>

        <Pressable onPress={() => {
            if (recording && recordedSteps.length > 0) {
              addRecordingToLibrary({
                name: `تسجيل ${currentHost} — ${new Date().toLocaleTimeString('ar')}`,
                steps: [...recordedSteps],
                createdAt: new Date().toISOString().split('T')[0],
                duration: `${Math.round(recordedSteps.length * 2.5)}s`,
              });
              addNotification({ type: 'success', title: '🔴 تسجيل محفوظ في المكتبة', message: `${recordedSteps.length} خطوة`, screen: 'library' });
            }
            setRecording(v => !v);
            if (!recording) setRecordedSteps([]);
          }}
          style={[styles.toolBtn, recording && styles.toolBtnRecord]}>
          <MaterialCommunityIcons name={recording ? 'stop-circle' : 'record-circle'} size={18} color={recording ? Colors.error : Colors.textMuted} />
          <Text style={[styles.toolLabel, recording && { color: Colors.error }]}>{recording ? `● ${recordedSteps.length}` : 'Record'}</Text>
        </Pressable>

        <Pressable onPress={() => {
          if (watchdogActive) { setWatchdogActive(false); return; }
          setWatchdogActive(true);
          webViewRef.current?.injectJavaScript(`
            (function() {
              if (window.__forge_watchdog) return;
              window.__forge_watchdog = true;
              var prev = '', stable = 0, checks = 0;
              var iv = setInterval(function(){
                checks++;
                var el = document.querySelector('[data-message-author-role="assistant"]:last-child, .response-content:last-child, pre:last-child');
                if (el) {
                  var curr = el.innerText || el.textContent || '';
                  if (curr !== prev) { prev = curr; stable = 0; }
                  else stable++;
                  if (stable >= 4 && curr.length > 30) {
                    clearInterval(iv);
                    window.__forge_watchdog = false;
                    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({type:'watchdog_complete',content:curr.substring(0,800)}));
                  }
                }
                if (checks > 300) { clearInterval(iv); window.__forge_watchdog = false; }
              }, 600);
            })(); true;
          `);
        }} style={[styles.toolBtn, watchdogActive && styles.toolBtnActive]}>
          <MaterialCommunityIcons name="eye" size={18} color={watchdogActive ? Colors.primary : Colors.textMuted} />
          <Text style={[styles.toolLabel, watchdogActive && styles.toolLabelActive]}>Watch</Text>
        </Pressable>

        <Pressable onPress={() => setWaitPanel(v => !v)}
          style={[styles.toolBtn, (waitPanel || waitActive) && styles.toolBtnActive]}>
          <MaterialCommunityIcons name="eye-off" size={18} color={(waitPanel || waitActive) ? Colors.warning : Colors.textMuted} />
          <Text style={[styles.toolLabel, (waitPanel || waitActive) && { color: Colors.warning }]}>WaitGone</Text>
        </Pressable>

        <Pressable
          onPress={() => setHeadlessMode(v => !v)}
          style={[styles.toolBtn, headlessMode && styles.toolBtnActive]}>
          <MaterialCommunityIcons name="eye-off-outline" size={18} color={headlessMode ? Colors.accent : Colors.textMuted} />
          <Text style={[styles.toolLabel, headlessMode && { color: Colors.accent }]}>Headless</Text>
        </Pressable>

        <Pressable onPress={() => setToolMode(v => v === 'console' ? 'none' : 'console')}
          style={[styles.toolBtn, toolMode === 'console' && styles.toolBtnActive]}>
          <MaterialCommunityIcons name="console" size={18} color={toolMode === 'console' ? Colors.primary : Colors.textMuted} />
          <Text style={[styles.toolLabel, toolMode === 'console' && styles.toolLabelActive]}>Console</Text>
        </Pressable>
      </View>

      {/* Console */}
      {toolMode === 'console' && (
        <View style={styles.consolePanel}>
          <View style={styles.consolePanelHeader}>
            <MaterialCommunityIcons name="console" size={12} color={Colors.primary} />
            <Text style={styles.consolePanelTitle}>Console ({consoleLogs.length})</Text>
            <Pressable onPress={() => setConsoleLogs([])} style={{ marginLeft: 'auto' as any }}>
              <Text style={styles.consoleClear}>مسح</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.consoleScroll} showsVerticalScrollIndicator={false}>
            {consoleLogs.slice(-40).map((log, i) => (
              <Text key={i} style={[styles.consoleLog, { color: logColor(log.type) }]}>
                {logIcon(log.type)} {log.msg}
              </Text>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Selectors panel */}
      {selectedSelectors.length > 0 && toolMode !== 'console' && (
        <View style={styles.selectorsPanel}>
          <Text style={styles.selectorsPanelTitle}>📌 Selectors ({selectedSelectors.length}):</Text>
          {selectedSelectors.slice(-3).map((s, i) => (
            <Text key={i} style={styles.selectorItem}>{s}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  pipelineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.warningDim, borderBottomWidth: 1, borderBottomColor: Colors.warning + '50',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  pipelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.error },
  pipelineText: { color: Colors.warning, fontSize: FontSize.xs, fontWeight: '700', flex: 1 },

  compactBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 5,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  compactToggle: {
    width: 22, height: 22, borderRadius: Radius.sm, backgroundColor: Colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  compactUrlWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.bg, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
    borderWidth: 1, borderColor: Colors.border,
  },
  compactUrl: { color: Colors.textMuted, fontSize: FontSize.xs, flex: 1 },
  loadingDotSm: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.warning },

  collapsibleHeader: { backgroundColor: Colors.surface },

  tabsBar: { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, maxHeight: 34 },
  tabsContent: { alignItems: 'center', gap: 2, paddingHorizontal: Spacing.xs },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 2, borderBottomColor: 'transparent', maxWidth: 140,
  },
  tabActive: { borderBottomColor: Colors.primary },
  tabTitle: { color: Colors.textDim, fontSize: FontSize.xs },
  tabTitleActive: { color: Colors.text },
  loadingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.warning },
  newTabBtn: { padding: Spacing.sm },

  urlBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  navBtn: { padding: Spacing.xs },
  urlInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.bg, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, height: 32,
    borderWidth: 1, borderColor: Colors.border,
  },
  urlInput: { flex: 1, color: Colors.text, fontSize: FontSize.sm },

  presets: { maxHeight: 32, backgroundColor: Colors.surface2 },
  presetsContent: { alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: 4 },
  preset: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.md, paddingVertical: 3,
    backgroundColor: Colors.surface3, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  presetLabel: { fontSize: FontSize.xs, fontWeight: '600' },

  loadingBar: { height: 2, backgroundColor: Colors.border, overflow: 'hidden' },
  loadingFill: { height: 2, width: '60%', backgroundColor: Colors.primary },

  webViewWrap: { flex: 1, position: 'relative' },
  webViewHidden: { height: 0, overflow: 'hidden', position: 'absolute' },

  // Headless terminal
  headlessTerminal: {
    flex: 1, backgroundColor: '#0D1117', borderRadius: 0,
  },
  headlessHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: '#161B22', borderBottomWidth: 1, borderBottomColor: '#30363D',
  },
  headlessTrafficLights: { flexDirection: 'row', gap: 5, marginRight: 4 },
  headlessLight: { width: 10, height: 10, borderRadius: 5 },
  headlessTermTitle: { color: '#8B949E', fontSize: FontSize.xs, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', flex: 1 },
  headlessLoadingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.warning + '15', borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 2 },
  headlessLoadingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.warning },
  headlessLoadingText: { color: Colors.warning, fontSize: 9 },
  headlessClearBtn: { padding: 4 },
  headlessUrlBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.lg, paddingVertical: 5,
    backgroundColor: '#0D1117', borderBottomWidth: 1, borderBottomColor: '#21262D',
  },
  headlessUrl: { color: '#58A6FF', fontSize: FontSize.xs, flex: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  headlessStatusBadge: { borderRadius: Radius.full, paddingHorizontal: 6, paddingVertical: 2 },
  headlessStatusText: { fontSize: 9, fontWeight: '700' },
  headlessPipelineBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingVertical: 5,
    backgroundColor: Colors.running + '10', borderBottomWidth: 1, borderBottomColor: Colors.running + '30',
  },
  headlessPipelineDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.running },
  headlessPipelineText: { color: Colors.running, fontSize: FontSize.xs, fontWeight: '600' },
  headlessLogScroll: { flex: 1, padding: Spacing.md },
  headlessPrompt: { color: '#3FB950', fontSize: FontSize.xs, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 18, marginBottom: Spacing.sm },
  headlessEmpty: { color: '#484F58', fontSize: FontSize.xs, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 20 },
  headlessLogRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, marginBottom: 3 },
  headlessLogTime: { color: '#484F58', fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', minWidth: 70 },
  headlessLogIcon: { fontSize: FontSize.xs, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', width: 12, textAlign: 'center' },
  headlessLogMsg: { fontSize: FontSize.xs, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 16, flex: 1 },
  headlessCursorRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm },
  headlessPromptChar: { color: '#3FB950', fontSize: FontSize.xs, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  headlessCursor: { width: 8, height: 14, backgroundColor: '#58A6FF', borderRadius: 1 },
  headlessControls: {
    flexDirection: 'row', gap: Spacing.xs,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    backgroundColor: '#161B22', borderTopWidth: 1, borderTopColor: '#30363D',
  },
  headlessControlBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: '#21262D', borderRadius: Radius.sm, paddingVertical: 6,
    borderWidth: 1, borderColor: '#30363D',
  },
  headlessControlText: { color: '#8B949E', fontSize: 9, fontWeight: '600' },
  webview: { flex: 1 },

  pickerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'flex-end', paddingBottom: Spacing.xl,
  },
  pickerHint: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primaryDim, borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderWidth: 1, borderColor: Colors.primary,
  },
  pickerHintText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600' },

  waitPanel: {
    backgroundColor: Colors.warningDim, borderTopWidth: 1, borderTopColor: Colors.warning + '50',
    padding: Spacing.md, paddingHorizontal: Spacing.lg, gap: Spacing.sm,
  },
  waitPanelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  waitPanelTitle: { color: Colors.warning, fontSize: FontSize.sm, fontWeight: '700', flex: 1 },
  waitInputRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  waitInput: {
    flex: 1, backgroundColor: Colors.bg, borderRadius: Radius.sm,
    padding: Spacing.sm, color: Colors.text, fontSize: FontSize.xs,
    borderWidth: 1, borderColor: Colors.warning + '50',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  waitRunBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.warning, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  waitRunBtnActive: { backgroundColor: Colors.warningDim, borderWidth: 1, borderColor: Colors.warning },
  waitRunBtnText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },
  waitPreset: {
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
    backgroundColor: Colors.surface2, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border,
  },
  waitPresetActive: { borderColor: Colors.warning },
  waitPresetText: { color: Colors.textDim, fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  toolbar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
    paddingTop: Spacing.xs, paddingHorizontal: Spacing.sm,
  },
  toolBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: Spacing.sm, borderRadius: Radius.sm },
  toolBtnActive: { backgroundColor: Colors.primaryDim },
  toolBtnRecord: { backgroundColor: Colors.errorDim },
  toolLabel: { color: Colors.textDim, fontSize: 10 },
  toolLabelActive: { color: Colors.primary, fontWeight: '600' },

  consolePanel: { height: 150, backgroundColor: Colors.bg, borderTopWidth: 1, borderTopColor: Colors.border },
  consolePanelHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.lg, paddingVertical: 5,
    borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface,
  },
  consolePanelTitle: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700', flex: 1 },
  consoleClear: { color: Colors.textDim, fontSize: FontSize.xs },
  consoleScroll: { padding: Spacing.sm },
  consoleLog: {
    fontSize: FontSize.xs, lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  headlessBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: Colors.accentDim, borderRadius: Radius.full,
    paddingHorizontal: 5, paddingVertical: 1,
    borderWidth: 1, borderColor: Colors.accent + '40',
  },
  headlessBadgeText: { color: Colors.accent, fontSize: 8, fontWeight: '700' },

  selectorsPanel: {
    backgroundColor: Colors.surface2, borderTopWidth: 1, borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xs,
  },
  selectorsPanelTitle: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '700', marginBottom: 2 },
  selectorItem: { color: Colors.textMuted, fontSize: FontSize.xs, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});
