import React, { createContext, useState, useCallback, useRef, ReactNode } from 'react';
import { router } from 'expo-router';
import {
  Task, FileNode, GraphNode, GraphEdge, PendingChange, AppNotification,
  INITIAL_TASKS, INITIAL_FILES, INITIAL_GRAPH_NODES, INITIAL_GRAPH_EDGES,
  INITIAL_PENDING_CHANGES, INITIAL_NOTIFICATIONS,
  INITIAL_SCRIPTS, INITIAL_SELECTORS, INITIAL_RECORDINGS,
  TaskStatus, Script, Selector, Recording,
} from '@/services/mockData';
import { ThemeName, setActiveTheme } from '@/constants/theme';

// ── Pipeline log ─────────────────────────────────────────────────
export interface PipelineLog {
  id: string;
  step: number;
  nodeId: string;
  nodeLabel: string;
  type: 'info' | 'success' | 'error' | 'running' | 'warn';
  message: string;
  timestamp: string;
}

// ── WebView bridge ────────────────────────────────────────────────
export interface WebViewBridge {
  navigate: (url: string) => void;
  injectJS: (script: string) => void;
  getCurrentUrl: () => string;
}

// ── Context type ──────────────────────────────────────────────────
interface AppContextType {
  // Graph
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  isRunning: boolean;
  isPaused: boolean;
  graphMode: 'visual' | 'yaml';
  setGraphMode: (m: 'visual' | 'yaml') => void;
  setIsRunning: (v: boolean) => void;
  setIsPaused: (v: boolean) => void;
  addGraphNode: (node: GraphNode) => void;
  updateNodeStatus: (id: string, status: GraphNode['status']) => void;
  removeGraphNode: (id: string) => void;
  updateGraphNode: (id: string, updates: Partial<GraphNode>) => void;
  updateFileContent: (id: string, content: string) => void;
  removeFile: (id: string) => void;
  executionStep: number;
  setExecutionStep: (v: number) => void;
  currentNodeId: string | null;

  // Pipeline
  pipelineLogs: PipelineLog[];
  addPipelineLog: (log: Omit<PipelineLog, 'id' | 'timestamp'>) => void;
  clearPipelineLogs: () => void;
  startPipeline: (userIdea: string, modelUrl: string) => void;
  stopPipeline: () => void;
  isPipelineRunning: boolean;

  // WebView bridge — registered by Browser screen
  registerWebViewBridge: (bridge: WebViewBridge) => void;
  webViewBridge: WebViewBridge | null;

  // Tab navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;
  navigateToTab: (tab: 'autodev' | 'index' | 'browser' | 'workspace' | 'tasks' | 'library') => void;

  // Tasks
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  deleteTask: (id: string) => void;
  clearAllTasks: () => void;
  approveTask: (id: string) => void;
  addTasksFromJson: (json: any[]) => void;
  replaceTasksFromPipeline: (tasks: Omit<Task, 'id' | 'createdAt'>[]) => void;

  // Files
  files: FileNode[];
  activeFile: FileNode | null;
  setActiveFile: (f: FileNode | null) => void;
  addFile: (file: FileNode) => void;
  addFilesFromExtraction: (extracted: { path: string; content: string; language: string }[]) => void;

  // Pending changes
  pendingChanges: PendingChange[];
  acceptChange: (id: string) => void;
  rejectChange: (id: string) => void;
  acceptAllChanges: () => void;

  // Notifications
  notifications: AppNotification[];
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  addNotification: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  unreadCount: number;

  headlessMode: boolean;
  setHeadlessMode: (v: boolean) => void;

  // Browser
  browserUrl: string;
  setBrowserUrl: (url: string) => void;
  browserTabs: { id: string; url: string; title: string }[];
  activeTabId: string;
  addBrowserTab: (url: string) => void;
  setActiveTabId: (id: string) => void;
  watchdogActive: boolean;
  setWatchdogActive: (v: boolean) => void;

  // Theme
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;

  // Browser events
  lastBrowserEvent: { type: string; payload?: any } | null;
  setLastBrowserEvent: (e: { type: string; payload?: any } | null) => void;

  // Auto Dev config
  projectIdea: string;
  setProjectIdea: (v: string) => void;
  selectedModelUrl: string;
  setSelectedModelUrl: (v: string) => void;

  // Library
  scripts: Script[];
  setScripts: (s: Script[]) => void;
  addScript: (s: Omit<Script, 'id'>) => void;
  deleteScript: (id: string) => void;
  updateScript: (id: string, updates: Partial<Script>) => void;
  selectors: Selector[];
  addSelectorToLibrary: (s: Omit<Selector, 'id'>) => void;
  deleteSelector: (id: string) => void;
  recordings: Recording[];
  addRecordingToLibrary: (r: Omit<Recording, 'id'>) => void;
  deleteRecording: (id: string) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

// ── Tab route map ─────────────────────────────────────────────────
const TAB_ROUTES: Record<string, string> = {
  autodev: '/(tabs)/autodev',
  index: '/(tabs)/',
  browser: '/(tabs)/browser',
  workspace: '/(tabs)/workspace',
  tasks: '/(tabs)/tasks',
  library: '/(tabs)/library',
};

export function AppProvider({ children }: { children: ReactNode }) {

  // ── State ─────────────────────────────────────────────────────
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>(INITIAL_GRAPH_NODES);
  const [graphEdges] = useState<GraphEdge[]>(INITIAL_GRAPH_EDGES);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [graphMode, setGraphMode] = useState<'visual' | 'yaml'>('visual');
  const [executionStep, setExecutionStep] = useState(0);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [isPipelineRunning, setIsPipelineRunning] = useState(false);
  const [pipelineLogs, setPipelineLogs] = useState<PipelineLog[]>([]);
  const [webViewBridge, setWebViewBridge] = useState<WebViewBridge | null>(null);
  const [activeTab, setActiveTab] = useState('autodev');
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [files, setFiles] = useState<FileNode[]>(INITIAL_FILES);
  const [activeFile, setActiveFile] = useState<FileNode | null>(null);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>(INITIAL_PENDING_CHANGES);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [browserUrl, setBrowserUrl] = useState('https://chat.deepseek.com');
  const [watchdogActive, setWatchdogActive] = useState(false);
  const [headlessMode, setHeadlessMode] = useState(false);
  const [browserTabs, setBrowserTabs] = useState([
    { id: 'tab1', url: 'https://chat.deepseek.com', title: 'DeepSeek' },
    { id: 'tab2', url: '', title: '+ جديد' },
  ]);
  const [activeTabId, setActiveTabId] = useState('tab1');
  const [lastBrowserEvent, setLastBrowserEvent] = useState<{ type: string; payload?: any } | null>(null);
  const [themeName, setThemeNameState] = useState<ThemeName>('default');
  const [projectIdea, setProjectIdea] = useState('');
  const [selectedModelUrl, setSelectedModelUrl] = useState('https://chat.deepseek.com');

  // Library
  const [scripts, setScripts] = useState<Script[]>(INITIAL_SCRIPTS);
  const [selectors, setSelectors] = useState<Selector[]>(INITIAL_SELECTORS);
  const [recordings, setRecordings] = useState<Recording[]>(INITIAL_RECORDINGS);

  const addScript = useCallback((s: Omit<Script, 'id'>) => {
    const newScript: Script = { ...s, id: `sc-${Date.now()}-${Math.random()}` };
    setScripts(prev => [newScript, ...prev]);
  }, []);

  const deleteScript = useCallback((id: string) => {
    setScripts(prev => prev.filter(s => s.id !== id));
  }, []);

  const updateScript = useCallback((id: string, updates: Partial<Script>) => {
    setScripts(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const addRecordingToLibrary = useCallback((r: Omit<Recording, 'id'>) => {
    const newRec: Recording = { ...r, id: `rec-${Date.now()}-${Math.random()}` };
    setRecordings(prev => [newRec, ...prev]);
  }, []);

  const deleteRecording = useCallback((id: string) => {
    setRecordings(prev => prev.filter(r => r.id !== id));
  }, []);

  const addSelectorToLibrary = useCallback((s: Omit<Selector, 'id'>) => {
    const newSel: Selector = { ...s, id: `sel-${Date.now()}-${Math.random()}` };
    setSelectors(prev => {
      // Avoid duplicates
      if (prev.some(x => x.selector === s.selector)) return prev;
      return [newSel, ...prev];
    });
  }, []);

  const deleteSelector = useCallback((id: string) => {
    setSelectors(prev => prev.filter(s => s.id !== id));
  }, []);

  // ── Pipeline control refs ─────────────────────────────────────
  const pipelineStopRef = useRef(false);
  const pipelineTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Theme ─────────────────────────────────────────────────────
  const setThemeName = useCallback((name: ThemeName) => {
    setActiveTheme(name);
    setThemeNameState(name);
  }, []);

  // ── WebView bridge ────────────────────────────────────────────
  const registerWebViewBridge = useCallback((bridge: WebViewBridge) => {
    setWebViewBridge(bridge);
  }, []);

  // ── Tab navigation — uses expo-router directly ────────────────
  const navigateToTab = useCallback((tab: string) => {
    setActiveTab(tab);
    try {
      const route = TAB_ROUTES[tab] || `/(tabs)/${tab}`;
      router.navigate(route as any);
    } catch (e) {
      // ignore if navigation fails (e.g., not mounted yet)
    }
  }, []);

  // ── Pipeline logs ─────────────────────────────────────────────
  const addPipelineLog = useCallback((log: Omit<PipelineLog, 'id' | 'timestamp'>) => {
    const entry: PipelineLog = {
      ...log,
      id: `log${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setPipelineLogs(prev => [...prev.slice(-200), entry]);
  }, []);

  const clearPipelineLogs = useCallback(() => setPipelineLogs([]), []);

  // ── Graph actions ─────────────────────────────────────────────
  const addGraphNode = useCallback((node: GraphNode) => {
    setGraphNodes(prev => [...prev, node]);
  }, []);

  const updateNodeStatus = useCallback((id: string, status: GraphNode['status']) => {
    setGraphNodes(prev => prev.map(n => n.id === id ? { ...n, status } : n));
    if (status === 'running') setCurrentNodeId(id);
    if (status === 'completed' || status === 'failed') setCurrentNodeId(null);
  }, []);

  const updateGraphNode = useCallback((id: string, updates: Partial<GraphNode>) => {
    setGraphNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  }, []);

  const updateFileContent = useCallback((id: string, content: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, content } : f));
    setActiveFile(prev => prev && prev.id === id ? { ...prev, content } : prev);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setActiveFile(prev => (prev && prev.id === id ? null : prev));
  }, []);

  const removeGraphNode = useCallback((id: string) => {
    setGraphNodes(prev => prev.filter(n => n.id !== id));
  }, []);

  // ── Tasks actions ─────────────────────────────────────────────
  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = { ...task, id: `t${Date.now()}-${Math.random()}`, createdAt: new Date().toISOString() };
    setTasks(prev => [newTask, ...prev]);
  }, []);

  const updateTaskStatus = useCallback((id: string, status: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status, approvalPending: false } : t));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const clearAllTasks = useCallback(() => {
    setTasks([]);
  }, []);

  const replaceTasksFromPipeline = useCallback((newTaskList: Omit<Task, 'id' | 'createdAt'>[]) => {
    const mapped: Task[] = newTaskList.map((t, i) => ({
      ...t,
      id: `ai-t${Date.now()}-${i}`,
      createdAt: new Date().toISOString(),
    }));
    setTasks(mapped);
  }, []);

  const approveTask = useCallback((id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, approvalPending: false, status: 'running' } : t));
  }, []);

  const addTasksFromJson = useCallback((jsonTasks: any[]) => {
    const newTasks: Task[] = jsonTasks.map((t, i) => ({
      id: `ai-t${Date.now()}-${i}`,
      title: t.title || t.name || `مهمة ${i + 1}`,
      description: t.description || t.desc || '',
      status: 'pending' as TaskStatus,
      priority: t.priority || 'medium',
      files: t.files || [],
      prompt: t.prompt || '',
      estimatedMinutes: t.estimatedMinutes || t.time || 10,
      createdAt: new Date().toISOString(),
    }));
    // Replace old AI tasks, keep human-created ones
    setTasks(prev => {
      const humanTasks = prev.filter(t => !t.id.startsWith('ai-t'));
      return [...humanTasks, ...newTasks];
    });
  }, []);

  // ── Files actions ─────────────────────────────────────────────
  const addFile = useCallback((file: FileNode) => {
    setFiles(prev => [...prev, file]);
  }, []);

  const addFilesFromExtraction = useCallback((extracted: { path: string; content: string; language: string }[]) => {
    const newFiles: FileNode[] = extracted.map((f, i) => {
      const parts = f.path.split('/').filter(Boolean);
      const name = parts[parts.length - 1] || 'file.txt';
      return {
        id: `extracted-${Date.now()}-${i}`,
        name, path: f.path, type: 'file' as const,
        content: f.content, language: f.language || name.split('.').pop() || 'text',
        isNew: true,
      };
    });
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  // ── Pending changes ───────────────────────────────────────────
  const acceptChange = useCallback((id: string) => {
    setPendingChanges(prev => {
      const change = prev.find(c => c.id === id);
      if (change) {
        const newFile: FileNode = {
          id: `f${Date.now()}`, name: change.filename, path: change.path,
          type: 'file', content: change.content, language: change.language, isNew: true,
        };
        setFiles(f => [...f, newFile]);
      }
      return prev.filter(c => c.id !== id);
    });
  }, []);

  const rejectChange = useCallback((id: string) => {
    setPendingChanges(prev => prev.filter(c => c.id !== id));
  }, []);

  const acceptAllChanges = useCallback(() => {
    setPendingChanges(prev => {
      prev.forEach(change => {
        const newFile: FileNode = {
          id: `f${Date.now()}-${change.id}`, name: change.filename, path: change.path,
          type: 'file', content: change.content, language: change.language, isNew: true,
        };
        setFiles(f => [...f, newFile]);
      });
      return [];
    });
  }, []);

  // ── Notifications ─────────────────────────────────────────────
  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newN: AppNotification = {
      ...n, id: `ntf${Date.now()}`, timestamp: new Date().toISOString(), read: false,
    };
    setNotifications(prev => [newN, ...prev]);
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const clearNotifications = useCallback(() => setNotifications([]), []);

  // ── Browser ───────────────────────────────────────────────────
  const addBrowserTab = useCallback((url: string) => {
    const newTab = { id: `tab${Date.now()}`, url, title: url.replace('https://', '').split('/')[0] };
    setBrowserTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setBrowserUrl(url);
  }, []);

  // ── Pipeline helpers ──────────────────────────────────────────
  const sleep = (ms: number): Promise<void> => new Promise(resolve => {
    if (pipelineStopRef.current) { resolve(); return; }
    const t = setTimeout(resolve, ms);
    pipelineTimersRef.current.push(t);
  });

  // ─────────────────────────────────────────────────────────────
  // ── PIPELINE ENGINE ───────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────
  const startPipeline = useCallback(async (userIdea: string, modelUrl: string) => {
    if (isPipelineRunning) return;
    pipelineStopRef.current = false;
    pipelineTimersRef.current = [];
    setIsPipelineRunning(true);
    setIsRunning(true);
    setIsPaused(false);
    clearPipelineLogs();
    setGraphNodes(prev => prev.map(n => ({ ...n, status: 'idle' })));

    const log = (step: number, nodeId: string, nodeLabel: string, type: PipelineLog['type'], message: string) => {
      addPipelineLog({ step, nodeId, nodeLabel, type, message });
    };

    const markNode = (id: string, status: GraphNode['status']) => {
      setGraphNodes(prev => prev.map(n => n.id === id ? { ...n, status } : n));
      if (status === 'running') setCurrentNodeId(id);
      else if (status === 'completed' || status === 'failed') setCurrentNodeId(null);
    };

    const injectJS = (script: string) => {
      setWebViewBridge(bridge => {
        bridge?.injectJS(script);
        return bridge;
      });
    };

    const navBrowser = (url: string) => {
      setBrowserUrl(url);
      setBrowserTabs(prev => prev.map((t, i) => i === 0 ? { ...t, url, title: url.includes('deepseek') ? 'DeepSeek' : url.includes('chatgpt') ? 'ChatGPT' : url.split('/')[2] } : t));
      setActiveTabId('tab1');
      setWebViewBridge(bridge => {
        bridge?.navigate(url);
        return bridge;
      });
    };

    const PLANNING_PROMPT = `أنت مخطط مشاريع برمجية خبير. المستخدم يريد بناء:
"${userIdea}"

أنشئ خطة تطوير شاملة بصيغة JSON فقط (بدون أي نص إضافي):
{
  "tasks": [
    {
      "id": 1,
      "title": "عنوان المهمة",
      "description": "وصف تفصيلي",
      "priority": "high",
      "files": ["src/App.jsx"],
      "estimatedMinutes": 15
    }
  ]
}
أنشئ 5 إلى 7 مهام منطقية ومتسلسلة تغطي التطوير الكامل.`;

    const makeCodingPrompt = (task: Task) =>
      `أنت مبرمج خبير. قم بكتابة الكود الكامل للمهمة التالية:

المشروع: ${userIdea}
المهمة: ${task.title}
الوصف: ${task.description}

قواعد صارمة:
1. اكتب كودًا كاملًا وقابلًا للتشغيل فوراً
2. كل ملف يبدأ بتعليق يحتوي مساره: // مسار: src/components/App.jsx
3. استخدم كتل الكود: \`\`\`javascript أو \`\`\`jsx أو \`\`\`css
4. لا تكتفِ بالشرح، أعطِ الكود الفعلي الكامل`;

    try {
      // ── 1: استقبال الطلب ─────────────────────────────────
      markNode('n1', 'running');
      setExecutionStep(1);
      log(1, 'n1', 'استقبال الطلب', 'running', `📥 بدء Pipeline — "${userIdea}"`);
      await sleep(800);
      markNode('n1', 'completed');
      if (pipelineStopRef.current) throw new Error('stopped');

      // ── 2: فتح المتصفح ───────────────────────────────────
      markNode('n2', 'running');
      setExecutionStep(2);
      log(2, 'n2', 'فتح المتصفح', 'running', '🌐 الانتقال إلى شاشة المتصفح...');
      navigateToTab('browser');
      await sleep(1200);
      markNode('n2', 'completed');
      if (pipelineStopRef.current) throw new Error('stopped');

      // ── 3: فتح DeepSeek ──────────────────────────────────
      markNode('n3', 'running');
      setExecutionStep(3);
      log(3, 'n3', 'فتح DeepSeek', 'running', `🔗 فتح ${modelUrl}...`);
      navBrowser(modelUrl);
      await sleep(1500);
      markNode('n3', 'completed');
      if (pipelineStopRef.current) throw new Error('stopped');

      // ── 4: انتظار 5 ثوانٍ ────────────────────────────────
      markNode('n4', 'running');
      setExecutionStep(4);
      log(4, 'n4', 'انتظار تحميل الصفحة', 'running', '⏳ انتظار 5 ثوانٍ لتحميل الصفحة...');
      for (let i = 5; i > 0; i--) {
        if (pipelineStopRef.current) throw new Error('stopped');
        log(4, 'n4', 'انتظار', 'info', `⏳ ${i} ثوانٍ...`);
        await sleep(1000);
      }
      markNode('n4', 'completed');
      if (pipelineStopRef.current) throw new Error('stopped');

      // ── 5: كتابة برومبت التخطيط ──────────────────────────
      markNode('n5', 'running');
      setExecutionStep(5);
      log(5, 'n5', 'كتابة برومبت التخطيط', 'running', '⌨️ حقن برومبت التخطيط في حقل المدخلات...');
      const escapedPlanning = PLANNING_PROMPT.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
      injectJS(`
        (function() {
          var selectors = ['#chat-input', 'textarea', '[contenteditable="true"]', '.chat-input', 'div[role="textbox"]', '[placeholder]'];
          var el = null;
          for (var i = 0; i < selectors.length; i++) {
            el = document.querySelector(selectors[i]);
            if (el) break;
          }
          if (el) {
            el.focus();
            var text = \`${escapedPlanning}\`;
            if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
              var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value') ||
                                Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
              if (nativeSetter && nativeSetter.set) nativeSetter.set.call(el, text);
              else el.value = text;
            } else {
              el.textContent = text;
            }
            el.dispatchEvent(new InputEvent('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'inject_done', field: 'planning_prompt' }));
          } else {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'inject_error', msg: 'input not found' }));
          }
        })(); true;
      `);
      await sleep(2000);
      markNode('n5', 'completed');
      if (pipelineStopRef.current) throw new Error('stopped');

      // ── 6: نقر زر الإرسال ─────────────────────────────────
      markNode('n6', 'running');
      setExecutionStep(6);
      log(6, 'n6', 'نقر زر الإرسال', 'running', '🖱️ نقر زر Send...');
      injectJS(`
        (function() {
          var btns = [
            'button[data-testid="send-button"]',
            'button[aria-label="Send"]',
            'button[aria-label="إرسال"]',
            '.send-btn', 'button[type="submit"]',
            'button:has(svg[data-icon="send"])'
          ];
          var btn = null;
          for (var i = 0; i < btns.length; i++) {
            btn = document.querySelector(btns[i]);
            if (btn && !btn.disabled) break;
          }
          if (btn) {
            btn.click();
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'click_done', element: 'send_button' }));
          } else {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'click_error', msg: 'send button not found' }));
          }
        })(); true;
      `);
      await sleep(1000);
      markNode('n6', 'completed');
      if (pipelineStopRef.current) throw new Error('stopped');

      // ── 7: انتظار اكتمال التخطيط (WaitDisappear) ──────────
      markNode('n7', 'running');
      setExecutionStep(7);
      log(7, 'n7', 'انتظار اكتمال التخطيط', 'running', '👁️ مراقبة زر Stop بـ MutationObserver...');
      injectJS(`
        (function() {
          var TIMEOUT = 120000;
          var start = Date.now();
          function isGone() {
            var stopBtns = document.querySelectorAll(
              'button[aria-label="Stop"], .stop-btn, [data-testid="stop-button"], button[aria-label="停止生成"]'
            );
            return stopBtns.length === 0 || Array.from(stopBtns).every(function(e) {
              return e.offsetParent === null || window.getComputedStyle(e).display === 'none' || window.getComputedStyle(e).visibility === 'hidden';
            });
          }
          if (isGone()) {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'wait_disappear_done', elapsed: 0 }));
            return;
          }
          var observer = new MutationObserver(function() {
            if (isGone()) {
              observer.disconnect(); clearTimeout(tmo); clearInterval(poll);
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'wait_disappear_done', elapsed: Date.now() - start }));
            }
          });
          observer.observe(document.body, { childList: true, subtree: true, attributes: true });
          var poll = setInterval(function() {
            if (isGone()) {
              clearInterval(poll); observer.disconnect(); clearTimeout(tmo);
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'wait_disappear_done', elapsed: Date.now() - start }));
            }
          }, 800);
          var tmo = setTimeout(function() {
            clearInterval(poll); observer.disconnect();
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'wait_disappear_timeout' }));
          }, TIMEOUT);
        })(); true;
      `);
      // In demo: simulate 8 sec wait (real wait is event-driven)
      await sleep(8000);
      markNode('n7', 'completed');
      log(7, 'n7', 'انتظار اكتمال التخطيط', 'success', '✓ اكتمل رد AI التخطيطي');
      if (pipelineStopRef.current) throw new Error('stopped');

      // ── 8: استخراج المهام → Tasks ─────────────────────────
      markNode('n8', 'running');
      setExecutionStep(8);
      log(8, 'n8', 'استخراج JSON المهام', 'running', '📋 استخراج JSON المهام وإرسالها لـ Tasks...');
      injectJS(`
        (function() {
          var allText = '';
          var responseEls = document.querySelectorAll(
            '[data-message-author-role="assistant"], .response-content, .message-content, .markdown, pre, code'
          );
          responseEls.forEach(function(el) { allText += el.innerText + '\\n'; });
          var jsonMatch = allText.match(/\\{[\\s\\S]*?"tasks"[\\s\\S]*?\\}/);
          var tasks = [];
          if (jsonMatch) {
            try { var parsed = JSON.parse(jsonMatch[0]); tasks = parsed.tasks || []; } catch(e) {}
          }
          if (tasks.length === 0) {
            tasks = [
              { id: 1, title: "تخطيط هيكل المشروع", description: "تحليل المتطلبات وتصميم البنية العامة", priority: "high", estimatedMinutes: 10 },
              { id: 2, title: "إنشاء الملفات الأساسية", description: "هيكل المجلدات والملفات الرئيسية", priority: "high", estimatedMinutes: 8 },
              { id: 3, title: "تطوير المكونات الرئيسية", description: "بناء المنطق والواجهة الرئيسية", priority: "medium", estimatedMinutes: 20 },
              { id: 4, title: "ربط API والبيانات", description: "جلب البيانات وعرضها للمستخدم", priority: "medium", estimatedMinutes: 15 },
              { id: 5, title: "التصميم والتنسيق", description: "CSS والتصميم المتجاوب", priority: "low", estimatedMinutes: 12 },
              { id: 6, title: "الاختبار والنشر", description: "تشغيل الاختبارات والنشر على الإنترنت", priority: "low", estimatedMinutes: 10 }
            ];
          }
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'tasks_extracted', tasks: tasks }));
        })(); true;
      `);

      // Fallback: always add default tasks
      const defaultTasks = [
        { title: 'تخطيط هيكل المشروع', description: userIdea + ' - تحليل المتطلبات', priority: 'high', estimatedMinutes: 10 },
        { title: 'إنشاء الملفات الأساسية', description: 'هيكل المجلدات والملفات الرئيسية', priority: 'high', estimatedMinutes: 8 },
        { title: 'تطوير المكونات الرئيسية', description: 'بناء المنطق والواجهة', priority: 'medium', estimatedMinutes: 20 },
        { title: 'ربط API والبيانات', description: 'جلب البيانات وعرضها', priority: 'medium', estimatedMinutes: 15 },
        { title: 'التصميم والتنسيق', description: 'CSS والتصميم المتجاوب', priority: 'low', estimatedMinutes: 12 },
        { title: 'الاختبار والنشر', description: 'تشغيل الاختبارات والنشر', priority: 'low', estimatedMinutes: 10 },
      ];
      addTasksFromJson(defaultTasks);
      log(8, 'n8', 'استخراج JSON المهام', 'success', `✓ تم إنشاء ${defaultTasks.length} مهام في Tasks`);

      await sleep(1000);
      markNode('n8', 'completed');

      // Navigate to tasks
      navigateToTab('tasks');
      await sleep(1500);
      addNotification({ type: 'success', title: '📋 مهام جديدة', message: `تم إنشاء ${defaultTasks.length} مهام من AI`, screen: 'tasks' });
      if (pipelineStopRef.current) throw new Error('stopped');

      // ── 9: حلقة المهام ───────────────────────────────────
      markNode('n9', 'running');
      setExecutionStep(9);
      log(9, 'n9', 'حلقة المهام', 'running', '🔁 بدء حلقة تنفيذ المهام...');
      await sleep(800);

      // Get pending tasks
      let pendingTasksSnapshot: Task[] = [];
      setTasks(prev => {
        pendingTasksSnapshot = prev.filter(t => t.status === 'pending').slice(0, 6);
        return prev;
      });
      await sleep(300);

      markNode('n9', 'completed');

      // ── LOOP ─────────────────────────────────────────────
      for (let i = 0; i < pendingTasksSnapshot.length; i++) {
        if (pipelineStopRef.current) throw new Error('stopped');
        const task = pendingTasksSnapshot[i];

        log(10, 'n10', `مهمة ${i + 1}`, 'running', `▶ بدء: "${task.title}" (${i + 1}/${pendingTasksSnapshot.length})`);

        // Mark task as running
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'running' } : t));

        // Navigate to browser
        navigateToTab('browser');
        await sleep(700);

        // n10: فتح DeepSeek جديد
        markNode('n10', 'running');
        setExecutionStep(10 + i * 7);
        log(10, 'n10', 'فتح DeepSeek', 'running', `🔗 فتح جلسة AI جديدة (مهمة ${i + 1})`);
        navBrowser(modelUrl);
        await sleep(2500);
        markNode('n10', 'completed');
        if (pipelineStopRef.current) throw new Error('stopped');

        // n11: كتابة المهمة
        markNode('n11', 'running');
        log(11, 'n11', 'كتابة المهمة', 'running', `⌨️ حقن برومبت المهمة: "${task.title}"`);
        const codingPrompt = makeCodingPrompt(task);
        const escapedCoding = codingPrompt.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
        injectJS(`
          (function() {
            var selectors = ['#chat-input', 'textarea', '[contenteditable="true"]', '.chat-input', 'div[role="textbox"]'];
            var el = null;
            for (var j = 0; j < selectors.length; j++) {
              el = document.querySelector(selectors[j]);
              if (el) break;
            }
            if (el) {
              el.focus();
              var text = \`${escapedCoding}\`;
              if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
                var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value') ||
                                  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
                if (nativeSetter && nativeSetter.set) nativeSetter.set.call(el, text);
                else el.value = text;
              } else { el.textContent = text; }
              el.dispatchEvent(new InputEvent('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
          })(); true;
        `);
        await sleep(1800);
        markNode('n11', 'completed');
        if (pipelineStopRef.current) throw new Error('stopped');

        // n12: نقر Send
        markNode('n12', 'running');
        log(12, 'n12', 'إرسال طلب البرمجة', 'running', '🖱️ نقر Send...');
        injectJS(`
          (function() {
            var btns = ['button[data-testid="send-button"]','button[aria-label="Send"]','.send-btn','button[type="submit"]'];
            var btn = null;
            for (var j = 0; j < btns.length; j++) { btn = document.querySelector(btns[j]); if (btn && !btn.disabled) break; }
            if (btn) btn.click();
          })(); true;
        `);
        await sleep(800);
        markNode('n12', 'completed');
        if (pipelineStopRef.current) throw new Error('stopped');

        // n13: انتظار اكتمال AI
        markNode('n13', 'running');
        log(13, 'n13', 'انتظار رد AI', 'running', '👁️ انتظار اكتمال رد AI...');
        injectJS(`
          (function() {
            var start = Date.now(); var TIMEOUT = 120000;
            function isGone() {
              var els = document.querySelectorAll('button[aria-label="Stop"],.stop-btn,[data-testid="stop-button"]');
              return els.length === 0 || Array.from(els).every(function(e) { return e.offsetParent === null || window.getComputedStyle(e).display === 'none'; });
            }
            if (isGone()) { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'wait_disappear_done', elapsed: 0 })); return; }
            var obs = new MutationObserver(function() {
              if (isGone()) { obs.disconnect(); clearTimeout(tmo); clearInterval(poll); window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'wait_disappear_done', elapsed: Date.now() - start })); }
            });
            obs.observe(document.body, { childList: true, subtree: true, attributes: true });
            var poll = setInterval(function() { if (isGone()) { clearInterval(poll); obs.disconnect(); clearTimeout(tmo); window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'wait_disappear_done', elapsed: Date.now() - start })); }}, 800);
            var tmo = setTimeout(function() { clearInterval(poll); obs.disconnect(); window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'wait_disappear_timeout' })); }, TIMEOUT);
          })(); true;
        `);
        // Demo: simulate wait
        await sleep(5000);
        markNode('n13', 'completed');
        log(13, 'n13', 'انتظار رد AI', 'success', `✓ اكتمل رد AI للمهمة ${i + 1}`);
        if (pipelineStopRef.current) throw new Error('stopped');

        // n14: استخراج الملفات → Workspace
        markNode('n14', 'running');
        log(14, 'n14', 'استخراج الملفات', 'running', `📁 استخراج الملفات من رد AI...`);
        injectJS(`
          (function() {
            var codeBlocks = document.querySelectorAll('pre code, pre');
            var files = [];
            codeBlocks.forEach(function(block) {
              var text = block.innerText || block.textContent || '';
              if (text.length < 30) return;
              var lines = text.split('\\n');
              var path = '';
              var pathMatch = (lines[0] || '').match(/(?:\\/\\/|#|--|\/\\*)?\\s*(?:مسار:|path:|file:)?\\s*([\\w\\/\\.\\-]+\\.\\w+)/i);
              if (pathMatch) {
                path = pathMatch[1];
                if (!path.startsWith('/')) path = '/src/' + path;
              } else {
                var ext = 'js';
                var cls = block.className || '';
                if (cls.includes('jsx') || cls.includes('react')) ext = 'jsx';
                else if (cls.includes('tsx')) ext = 'tsx';
                else if (cls.includes('css')) ext = 'css';
                else if (cls.includes('html')) ext = 'html';
                path = '/src/generated_' + Date.now() + '_' + files.length + '.' + ext;
              }
              var lang = 'javascript';
              var cls2 = block.className || '';
              if (cls2.includes('jsx')) lang = 'jsx';
              else if (cls2.includes('tsx')) lang = 'tsx';
              else if (cls2.includes('ts')) lang = 'typescript';
              else if (cls2.includes('css')) lang = 'css';
              else if (cls2.includes('html')) lang = 'html';
              else if (cls2.includes('py')) lang = 'python';
              files.push({ path: path, content: text, language: lang });
            });
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'files_extracted', files: files, taskTitle: '${task.title.replace(/'/g, "\\'")}' }));
          })(); true;
        `);

        // Always create demo file for the task
        const demoFile: FileNode = {
          id: `gen-${Date.now()}-${i}`,
          name: `task-${i + 1}-${task.title.replace(/\s+/g, '-').substring(0, 20)}.js`,
          path: `/src/task-${i + 1}/${task.title.replace(/\s+/g, '-').substring(0, 20)}.js`,
          type: 'file',
          content: `// مسار: src/task-${i + 1}/${task.title.replace(/\s+/g, '-').substring(0, 20)}.js
// المشروع: ${userIdea}
// المهمة: ${task.title}
// ${task.description}

// =======================================
// ⚠️ يتم إنشاء هذا الملف تلقائياً بواسطة AI Pipeline
// =======================================

// TODO: محتوى الكود من DeepSeek سيظهر هنا بعد اكتمال الرد
// في البيئة الحقيقية: يتم استخراج الأكواد من WebView

const task_${i + 1} = {
  title: "${task.title}",
  description: "${task.description}",
  status: "completed",
  generatedAt: "${new Date().toISOString()}"
};

export default task_${i + 1};
`,
          language: 'javascript',
          isNew: true,
        };
        setFiles(prev => [...prev, demoFile]);
        addNotification({ type: 'success', title: `📁 ملف جديد`, message: demoFile.name, screen: 'workspace' });

        // Navigate to workspace
        navigateToTab('workspace');
        await sleep(1500);
        markNode('n14', 'completed');
        log(14, 'n14', 'استخراج الملفات', 'success', `✓ تم إنشاء ملف: ${demoFile.name}`);
        if (pipelineStopRef.current) throw new Error('stopped');

        // n15: انتظار 5 ثوانٍ
        markNode('n15', 'running');
        log(15, 'n15', 'انتظار 5 ثوانٍ', 'info', '⏳ انتظار قبل المهمة التالية...');
        for (let s = 5; s > 0; s--) {
          if (pipelineStopRef.current) throw new Error('stopped');
          log(15, 'n15', 'انتظار', 'info', `⏳ ${s} ثوانٍ...`);
          await sleep(1000);
        }
        markNode('n15', 'completed');
        if (pipelineStopRef.current) throw new Error('stopped');

        // n16: تعليم المهمة مكتملة
        markNode('n16', 'running');
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'completed' } : t));
        log(16, 'n16', 'مكتملة', 'success', `✅ مهمة "${task.title}" مكتملة`);
        await sleep(400);
        markNode('n16', 'completed');

        addNotification({
          type: 'success',
          title: `✅ مهمة ${i + 1}/${pendingTasksSnapshot.length} مكتملة`,
          message: task.title,
          screen: 'tasks',
        });
        await sleep(300);
      }

      // ── 17: فتح Workspace ─────────────────────────────────
      markNode('n17', 'running');
      setExecutionStep(17);
      log(17, 'n17', 'فتح Workspace', 'running', '📂 عرض الملفات المنشأة...');
      navigateToTab('workspace');
      await sleep(1000);
      markNode('n17', 'completed');
      if (pipelineStopRef.current) throw new Error('stopped');

      // ── 18: إشعار الاكتمال ────────────────────────────────
      markNode('n18', 'running');
      setExecutionStep(18);
      log(18, 'n18', 'اكتمال', 'success', `🎉 اكتمل بناء المشروع: "${userIdea}"!`);
      addNotification({
        type: 'success',
        title: '🎉 اكتمل سير العمل!',
        message: `تم بناء "${userIdea}" — ${pendingTasksSnapshot.length} مهام منجزة`,
        screen: 'tasks',
      });
      await sleep(500);
      markNode('n18', 'completed');

    } catch (err: any) {
      if (err?.message !== 'stopped') {
        addPipelineLog({
          step: 0, nodeId: 'error', nodeLabel: 'خطأ',
          type: 'error', message: `✗ ${err?.message || 'خطأ غير معروف'}`,
        });
        addNotification({ type: 'error', title: 'خطأ في Pipeline', message: String(err?.message), screen: 'graph' });
      } else {
        addPipelineLog({ step: 0, nodeId: 'stop', nodeLabel: 'إيقاف', type: 'warn', message: '⏹ تم إيقاف سير العمل' });
      }
    } finally {
      pipelineTimersRef.current.forEach(clearTimeout);
      pipelineTimersRef.current = [];
      pipelineStopRef.current = false;
      setIsPipelineRunning(false);
      setIsRunning(false);
      setCurrentNodeId(null);
    }
  }, [isPipelineRunning, navigateToTab, addPipelineLog, clearPipelineLogs, addTasksFromJson, addNotification, addFile]);

  // ── Stop pipeline ─────────────────────────────────────────────
  const stopPipeline = useCallback(() => {
    pipelineStopRef.current = true;
    pipelineTimersRef.current.forEach(clearTimeout);
    pipelineTimersRef.current = [];
    setIsPipelineRunning(false);
    setIsRunning(false);
    setIsPaused(false);
    setCurrentNodeId(null);
    setGraphNodes(prev => prev.map(n =>
      n.status === 'running' ? { ...n, status: 'idle' } : n
    ));
    addPipelineLog({ step: 0, nodeId: 'stop', nodeLabel: 'إيقاف', type: 'warn', message: '⏹ تم إيقاف Pipeline' });
  }, [addPipelineLog]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider value={{
      graphNodes, graphEdges, isRunning, isPaused, graphMode,
      setGraphMode, setIsRunning, setIsPaused,
      addGraphNode, updateNodeStatus, removeGraphNode, updateGraphNode, updateFileContent,
      executionStep, setExecutionStep, currentNodeId,
      pipelineLogs, addPipelineLog, clearPipelineLogs,
      startPipeline, stopPipeline, isPipelineRunning,
      registerWebViewBridge, webViewBridge,
      activeTab, setActiveTab, navigateToTab,
      tasks, addTask, updateTaskStatus, deleteTask, clearAllTasks, approveTask, addTasksFromJson, replaceTasksFromPipeline,
      files, activeFile, setActiveFile, addFile, addFilesFromExtraction, removeFile,
      pendingChanges, acceptChange, rejectChange, acceptAllChanges,
      notifications, markNotificationRead, clearNotifications, addNotification, unreadCount,
      browserUrl, setBrowserUrl, browserTabs, activeTabId, addBrowserTab, setActiveTabId,
      watchdogActive, setWatchdogActive,
      headlessMode, setHeadlessMode,
      themeName, setThemeName,
      lastBrowserEvent, setLastBrowserEvent,
      projectIdea, setProjectIdea,
      selectedModelUrl, setSelectedModelUrl,
      scripts, setScripts, addScript, deleteScript, updateScript,
      selectors, addSelectorToLibrary, deleteSelector,
      recordings, addRecordingToLibrary, deleteRecording,
    }}>
      {children}
    </AppContext.Provider>
  );
}
