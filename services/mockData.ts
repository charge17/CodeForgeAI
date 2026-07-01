export type NodeType =
  | 'ai_model' | 'ai_webview' | 'go_browser' | 'go_workspace' | 'go_tasks'
  | 'navigate' | 'click' | 'type_text' | 'wait' | 'wait_selector' | 'wait_ai'
  | 'extract_text' | 'extract_files' | 'pick_selector' | 'execute_script'
  | 'take_screenshot' | 'create_file' | 'read_file' | 'update_file' | 'delete_file'
  | 'create_tasks' | 'complete_task' | 'delay' | 'condition' | 'loop'
  | 'switch' | 'parallel' | 'merge' | 'webhook' | 'code' | 'log'
  | 'trigger' | 'auto_dev_trigger' | 'ask_human' | 'deploy' | 'run_tests'
  | 'ai_comparator' | 'web_scraper' | 'send_notification' | 'db_query'
  | 'gen_docs' | 'smart_retry' | 'merge_files' | 'breakpoint'
  | 'wait_selector_appear' | 'wait_selector_disappear' | 'extract_json_tasks'
  | 'open_new_tab';

export type NodeCategory = 'AI' | 'Browser' | 'File' | 'Task' | 'Logic' | 'Trigger' | 'Advanced';

export interface NodeDef {
  type: NodeType;
  label: string;
  category: NodeCategory;
  icon: string;
  description: string;
  color: string;
}

export const NODE_DEFINITIONS: NodeDef[] = [
  // Triggers
  { type: 'trigger', label: 'Trigger', category: 'Trigger', icon: 'play-circle', description: 'بداية سير العمل', color: '#00C896' },
  { type: 'auto_dev_trigger', label: 'Auto Dev Start', category: 'Trigger', icon: 'rocket-launch', description: 'يستقبل الطلب من شاشة Auto Dev مع فكرة المشروع', color: '#00E5FF' },
  { type: 'webhook', label: 'Webhook', category: 'Trigger', icon: 'webhook', description: 'استقبال حدث خارجي', color: '#9C27B0' },
  // AI
  { type: 'ai_model', label: 'AI Model', category: 'AI', icon: 'brain', description: 'استدعاء نموذج ذكاء اصطناعي عبر API', color: '#7C4DFF' },
  { type: 'ai_webview', label: 'AI WebView', category: 'AI', icon: 'robot', description: 'أتمتة واجهة AI في المتصفح', color: '#9C27B0' },
  { type: 'ai_comparator', label: 'AI Comparator', category: 'AI', icon: 'compare', description: 'مقارنة مخرجات نموذجين AI للموجه ذاته', color: '#E040FB' },
  // Browser
  { type: 'go_browser', label: 'Go to Browser', category: 'Browser', icon: 'web', description: 'الانتقال لشاشة المتصفح الذكي', color: '#4F8EF7' },
  { type: 'navigate', label: 'Navigate', category: 'Browser', icon: 'directions', description: 'فتح رابط في المتصفح', color: '#2196F3' },
  { type: 'open_new_tab', label: 'Open New Tab', category: 'Browser', icon: 'tab-plus', description: 'فتح تبويب جديد مستقل في المتصفح', color: '#1976D2' },
  { type: 'click', label: 'Click', category: 'Browser', icon: 'cursor-default-click', description: 'النقر على عنصر عبر Selector', color: '#03A9F4' },
  { type: 'type_text', label: 'Type Text', category: 'Browser', icon: 'keyboard', description: 'كتابة نص في حقل إدخال عبر Selector', color: '#00BCD4' },
  { type: 'wait', label: 'Wait (ms)', category: 'Browser', icon: 'timer-sand', description: 'انتظار مدة زمنية ثابتة بالمللي ثانية', color: '#607D8B' },
  { type: 'wait_selector_appear', label: 'Wait Appear', category: 'Browser', icon: 'eye-check', description: 'انتظار ظهور عنصر Selector في الصفحة', color: '#546E7A' },
  { type: 'wait_selector_disappear', label: 'Wait Disappear', category: 'Browser', icon: 'eye-off', description: 'انتظار اختفاء عنصر — مثل تحول زر Stop إلى Send', color: '#78909C' },
  { type: 'wait_selector', label: 'Wait Selector', category: 'Browser', icon: 'crosshairs', description: 'انتظار ظهور/اختفاء عنصر (عام)', color: '#546E7A' },
  { type: 'wait_ai', label: 'Wait AI Done', category: 'Browser', icon: 'loading', description: 'انتظار توقف تدفق رد AI (MutationObserver)', color: '#78909C' },
  { type: 'extract_text', label: 'Extract Text', category: 'Browser', icon: 'text-box-outline', description: 'استخراج نص من عنصر محدد', color: '#26C6DA' },
  { type: 'extract_files', label: 'Extract & Save Files', category: 'Browser', icon: 'file-export', description: 'استخراج كتل الأكواد وإنشاء الملفات حسب مساراتها في Workspace', color: '#00ACC1' },
  { type: 'extract_json_tasks', label: 'Extract JSON Tasks', category: 'Browser', icon: 'code-json', description: 'استخراج JSON تخطيط المهام وإرسالهم لشاشة Tasks', color: '#00BFA5' },
  { type: 'take_screenshot', label: 'Screenshot', category: 'Browser', icon: 'camera', description: 'التقاط صورة الصفحة', color: '#0097A7' },
  { type: 'execute_script', label: 'Execute Script', category: 'Browser', icon: 'code-braces', description: 'حقن وتشغيل JavaScript', color: '#00838F' },
  { type: 'pick_selector', label: 'Pick Selector', category: 'Browser', icon: 'target', description: 'اختيار Selector بصري تفاعلي', color: '#006064' },
  { type: 'web_scraper', label: 'Web Scraper', category: 'Browser', icon: 'spider-web', description: 'استخراج بيانات منظمة من صفحة ويب', color: '#26C6DA' },
  // File
  { type: 'go_workspace', label: 'Go to Workspace', category: 'File', icon: 'folder-open', description: 'الانتقال لشاشة محرر الأكواد', color: '#00C896' },
  { type: 'create_file', label: 'Create File', category: 'File', icon: 'file-plus', description: 'إنشاء ملف جديد بمحتوى محدد', color: '#4CAF50' },
  { type: 'read_file', label: 'Read File', category: 'File', icon: 'file-eye', description: 'قراءة محتوى ملف إلى السياق', color: '#66BB6A' },
  { type: 'update_file', label: 'Update File', category: 'File', icon: 'file-edit', description: 'تعديل ملف موجود', color: '#81C784' },
  { type: 'delete_file', label: 'Delete File', category: 'File', icon: 'file-remove', description: 'حذف ملف', color: '#EF9A9A' },
  { type: 'merge_files', label: 'Merge Files', category: 'File', icon: 'file-multiple', description: 'دمج محتوى ملفات متعددة', color: '#A5D6A7' },
  { type: 'gen_docs', label: 'Generate Docs', category: 'File', icon: 'book-open-variant', description: 'توليد README وملفات التوثيق تلقائياً', color: '#69F0AE' },
  // Task
  { type: 'go_tasks', label: 'Go to Tasks', category: 'Task', icon: 'checkbox-marked', description: 'الانتقال لشاشة المهام', color: '#FFB547' },
  { type: 'create_tasks', label: 'Create Tasks', category: 'Task', icon: 'playlist-plus', description: 'إنشاء مهام من JSON تلقائياً في شاشة Tasks', color: '#FFA726' },
  { type: 'complete_task', label: 'Complete Task', category: 'Task', icon: 'check-circle', description: 'تعليم مهمة كمكتملة عبر معرفها', color: '#FB8C00' },
  { type: 'ask_human', label: 'Ask Human', category: 'Task', icon: 'account-question', description: 'توقف وانتظار قرار بشري', color: '#FF7043' },
  // Logic
  { type: 'delay', label: 'Delay', category: 'Logic', icon: 'clock-outline', description: 'تأخير زمني قابل للضبط', color: '#FF7043' },
  { type: 'condition', label: 'Condition', category: 'Logic', icon: 'source-branch', description: 'if/else بناءً على قيمة سياق', color: '#F4511E' },
  { type: 'loop', label: 'Loop Tasks', category: 'Logic', icon: 'refresh', description: 'تكرار على قائمة المهام حتى اكتمالها جميعاً', color: '#E64A19' },
  { type: 'switch', label: 'Switch', category: 'Logic', icon: 'directions-fork', description: 'توجيه متعدد المسارات حسب قيمة', color: '#BF360C' },
  { type: 'parallel', label: 'Parallel', category: 'Logic', icon: 'vector-arrange-below', description: 'تشغيل فروع متوازية', color: '#FF5722' },
  { type: 'merge', label: 'Merge', category: 'Logic', icon: 'merge', description: 'دمج مخرجات الفروع المتوازية', color: '#FF8A65' },
  { type: 'code', label: 'Code', category: 'Logic', icon: 'xml', description: 'تنفيذ JavaScript مخصص', color: '#8BC34A' },
  { type: 'log', label: 'Log', category: 'Logic', icon: 'console', description: 'إضافة سطر في سجل التنفيذ', color: '#689F38' },
  { type: 'smart_retry', label: 'Smart Retry', category: 'Logic', icon: 'reload-alert', description: 'إعادة المحاولة مع تأخير متزايد عند الفشل', color: '#FFA500' },
  { type: 'breakpoint', label: 'Breakpoint', category: 'Logic', icon: 'debug-step-over', description: 'نقطة توقف لفحص السياق يدوياً', color: '#FF4081' },
  { type: 'run_tests', label: 'Run Tests', category: 'Logic', icon: 'test-tube', description: 'تشغيل اختبارات المشروع', color: '#00C896' },
  { type: 'deploy', label: 'Deploy', category: 'Logic', icon: 'rocket-launch', description: 'نشر المشروع على Vercel/Netlify', color: '#7C4DFF' },
  // Advanced
  { type: 'send_notification', label: 'Send Notification', category: 'Advanced', icon: 'bell-ring', description: 'إرسال إشعار أو رسالة Slack/Discord', color: '#FF6B35' },
  { type: 'db_query', label: 'DB Query', category: 'Advanced', icon: 'database', description: 'استعلام SQL أو REST API لقاعدة بيانات', color: '#4FC3F7' },
];

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  files: string[];
  prompt?: string;
  estimatedMinutes?: number;
  dependencies?: string[];
  requiresApproval?: boolean;
  approvalPending?: boolean;
  createdAt: string;
}

export interface PendingChange {
  id: string;
  filename: string;
  path: string;
  content: string;
  language: string;
  source: string;
  timestamp: string;
  accepted?: boolean;
}

export interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  screen?: string;
}

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
  language?: string;
  isNew?: boolean;
}

export interface GraphNode {
  id: string;
  type: NodeType;
  status?: 'idle' | 'running' | 'completed' | 'failed' | 'paused';
  config?: Record<string, string>;
  label?: string;
  // Pipeline position (index in the pipeline array)
  pipelineIndex?: number;
  // For branching: group id
  groupId?: string;
  isBreakpoint?: boolean;
  // Legacy canvas coords (kept for YAML export)
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface Script {
  id: string;
  name: string;
  category: string;
  description: string;
  code: string;
  tags: string[];
}

export interface Selector {
  id: string;
  name: string;
  selector: string;
  type: 'input' | 'send' | 'stop' | 'response' | 'link' | 'button' | 'other';
  site?: string;
  alternatives?: string[];
}

export interface Recording {
  id: string;
  name: string;
  steps: string[];
  createdAt: string;
  duration: string;
}

export interface StarterKit {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  files: { path: string; content: string }[];
}

export const STARTER_KITS: StarterKit[] = [
  {
    id: 'sk1', name: 'React App', icon: 'react', color: '#61DAFB',
    description: 'تطبيق React مع Create React App',
    files: [
      { path: '/src/App.jsx', content: 'import React from "react";\n\nfunction App() {\n  return <div><h1>Hello World</h1></div>;\n}\n\nexport default App;' },
      { path: '/package.json', content: '{ "name": "react-app", "dependencies": { "react": "^18.0.0" } }' },
    ],
  },
  {
    id: 'sk2', name: 'Next.js', icon: 'web', color: '#ffffff',
    description: 'تطبيق Next.js مع App Router',
    files: [
      { path: '/app/page.tsx', content: 'export default function Home() {\n  return <main><h1>Next.js App</h1></main>;\n}' },
    ],
  },
  {
    id: 'sk3', name: 'Express API', icon: 'api', color: '#68A063',
    description: 'خادم Express.js REST API',
    files: [
      { path: '/server.js', content: 'const express = require("express");\nconst app = express();\napp.get("/", (req, res) => res.json({ status: "ok" }));\napp.listen(3000);' },
    ],
  },
  {
    id: 'sk4', name: 'Python Flask', icon: 'language-python', color: '#3776AB',
    description: 'تطبيق Flask مع REST endpoints',
    files: [
      { path: '/app.py', content: 'from flask import Flask, jsonify\napp = Flask(__name__)\n\n@app.route("/")\ndef index():\n    return jsonify({"status": "ok"})' },
    ],
  },
  {
    id: 'sk5', name: 'Expo App', icon: 'cellphone', color: '#000020',
    description: 'تطبيق موبايل بـ Expo + React Native',
    files: [
      { path: '/App.tsx', content: 'import { View, Text } from "react-native";\n\nexport default function App() {\n  return <View><Text>Hello Expo!</Text></View>;\n}' },
    ],
  },
  {
    id: 'sk6', name: 'Vue.js', icon: 'vuejs', color: '#42b883',
    description: 'تطبيق Vue 3 مع Composition API',
    files: [
      { path: '/src/App.vue', content: '<template>\n  <h1>{{ title }}</h1>\n</template>\n\n<script setup>\nconst title = "Vue App";\n</script>' },
    ],
  },
];

// ──────────────────────────────────────────────
// Default Pipeline: Auto Dev Full Workflow
// ──────────────────────────────────────────────
export const INITIAL_GRAPH_NODES: GraphNode[] = [
  {
    id: 'n1', type: 'auto_dev_trigger', status: 'idle',
    label: 'استقبال الطلب',
    config: { description: 'يستقبل فكرة المشروع من شاشة Auto Dev' },
  },
  {
    id: 'n2', type: 'go_browser', status: 'idle',
    label: 'فتح المتصفح',
    config: { target: 'شاشة المتصفح الذكي' },
  },
  {
    id: 'n3', type: 'navigate', status: 'idle',
    label: 'فتح DeepSeek',
    config: { url: 'https://chat.deepseek.com', tab: 'tab1' },
  },
  {
    id: 'n4', type: 'wait', status: 'idle',
    label: 'انتظار تحميل الصفحة',
    config: { duration: '5000', unit: 'ms' },
  },
  {
    id: 'n5', type: 'type_text', status: 'idle',
    label: 'كتابة برومبت التخطيط',
    config: {
      selector: '#chat-input',
      content: 'برومبت التخطيط الصارم + فكرة المستخدم → JSON مهام',
    },
  },
  {
    id: 'n6', type: 'click', status: 'idle',
    label: 'النقر على زر الإرسال',
    config: { selector: 'button[data-testid="send-button"]', label: 'زر Send' },
  },
  {
    id: 'n7', type: 'wait_selector_disappear', status: 'idle',
    label: 'انتظار اكتمال التخطيط',
    config: { selector: 'button[aria-label="Stop"]', description: 'ينتظر تحول زر Stop → Send مجدداً' },
  },
  {
    id: 'n8', type: 'extract_json_tasks', status: 'idle',
    label: 'استخراج المهام → Tasks',
    config: { selector: '.response-area:last-child', target: 'tasks_screen' },
  },
  // ── Loop Start ──
  {
    id: 'n9', type: 'loop', status: 'idle',
    label: 'حلقة على المهام',
    config: { source: 'tasks[]', condition: 'حتى اكتمال كل المهام' },
  },
  {
    id: 'n10', type: 'navigate', status: 'idle',
    label: 'فتح DeepSeek (مهمة جديدة)',
    config: { url: 'https://chat.deepseek.com', strategy: 'تبويب جديد لكل مهمة' },
  },
  {
    id: 'n11', type: 'type_text', status: 'idle',
    label: 'كتابة المهمة + برومبت البرمجة',
    config: {
      selector: '#chat-input',
      content: 'برومبت البرمجة الصارم + تفاصيل المهمة الحالية',
    },
  },
  {
    id: 'n12', type: 'click', status: 'idle',
    label: 'إرسال طلب البرمجة',
    config: { selector: 'button[data-testid="send-button"]' },
  },
  {
    id: 'n13', type: 'wait_selector_disappear', status: 'idle',
    label: 'انتظار اكتمال رد AI',
    config: { selector: 'button[aria-label="Stop"]', description: 'Stop يتحول لـ Send → اكتمل الرد' },
  },
  {
    id: 'n14', type: 'extract_files', status: 'idle',
    label: 'استخراج الملفات → Workspace',
    config: { source: 'pre code blocks', destination: 'workspace', createFolders: 'true' },
  },
  {
    id: 'n15', type: 'wait', status: 'idle',
    label: 'انتظار 5 ثوانٍ',
    config: { duration: '5000', unit: 'ms' },
  },
  {
    id: 'n16', type: 'complete_task', status: 'idle',
    label: 'تعليم المهمة مكتملة',
    config: { taskId: 'currentTask.id', screen: 'tasks' },
  },
  // ── Loop End ──
  {
    id: 'n17', type: 'go_workspace', status: 'idle',
    label: 'فتح Workspace',
    config: { action: 'عرض الملفات المنشأة' },
  },
  {
    id: 'n18', type: 'send_notification', status: 'idle',
    label: 'إشعار الاكتمال',
    config: { message: 'تم بناء المشروع بالكامل', channel: 'in-app' },
  },
];

export const INITIAL_GRAPH_EDGES: GraphEdge[] = [
  { id: 'e1', from: 'n1', to: 'n2' },
  { id: 'e2', from: 'n2', to: 'n3' },
  { id: 'e3', from: 'n3', to: 'n4' },
  { id: 'e4', from: 'n4', to: 'n5' },
  { id: 'e5', from: 'n5', to: 'n6' },
  { id: 'e6', from: 'n6', to: 'n7' },
  { id: 'e7', from: 'n7', to: 'n8' },
  { id: 'e8', from: 'n8', to: 'n9', label: 'إرسال لـ Tasks' },
  { id: 'e9', from: 'n9', to: 'n10', label: 'لكل مهمة' },
  { id: 'e10', from: 'n10', to: 'n11' },
  { id: 'e11', from: 'n11', to: 'n12' },
  { id: 'e12', from: 'n12', to: 'n13' },
  { id: 'e13', from: 'n13', to: 'n14' },
  { id: 'e14', from: 'n14', to: 'n15' },
  { id: 'e15', from: 'n15', to: 'n16' },
  { id: 'e16', from: 'n16', to: 'n9', label: 'مهمة تالية' },
  { id: 'e17', from: 'n9', to: 'n17', label: 'كل المهام مكتملة' },
  { id: 'e18', from: 'n17', to: 'n18' },
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 't1', title: 'تخطيط المشروع', priority: 'critical',
    description: 'تحليل المتطلبات وتحديد هيكل التطبيق',
    status: 'completed', files: ['README.md', 'plan.json'],
    prompt: 'خطط لتطبيق طقس بـ React يعرض درجة الحرارة والرياح والرطوبة',
    estimatedMinutes: 5, createdAt: '2026-06-28T10:00:00',
  },
  {
    id: 't2', title: 'إنشاء هيكل المشروع', priority: 'high',
    description: 'إنشاء مجلدات وملفات أساسية',
    status: 'completed', files: ['src/App.jsx', 'src/index.js', 'package.json'],
    estimatedMinutes: 8, createdAt: '2026-06-28T10:15:00',
  },
  {
    id: 't3', title: 'تطوير مكون الطقس', priority: 'high',
    description: 'بناء واجهة عرض بيانات الطقس',
    status: 'running', files: ['src/components/WeatherCard.jsx', 'src/hooks/useWeather.js'],
    estimatedMinutes: 15, createdAt: '2026-06-28T10:30:00',
  },
  {
    id: 't4', title: 'ربط API الطقس', priority: 'medium',
    description: 'تكامل مع OpenWeatherMap API',
    status: 'pending', files: ['src/services/weatherApi.js'],
    estimatedMinutes: 10, dependencies: ['t3'], createdAt: '2026-06-28T10:45:00',
  },
  {
    id: 't5', title: 'التصميم والتنسيق', priority: 'medium',
    description: 'إضافة CSS وتصميم متجاوب',
    status: 'pending', files: ['src/styles/main.css'],
    estimatedMinutes: 12, dependencies: ['t3'], createdAt: '2026-06-28T11:00:00',
  },
  {
    id: 't6', title: 'الاختبارات والنشر', priority: 'low',
    description: 'تشغيل الاختبارات ونشر على Vercel',
    status: 'pending', files: ['tests/', '.vercel.json'],
    requiresApproval: true, estimatedMinutes: 20,
    dependencies: ['t4', 't5'], createdAt: '2026-06-28T11:15:00',
  },
];

export const INITIAL_FILES: FileNode[] = [
  {
    id: 'src', name: 'src', path: '/src', type: 'folder',
    children: [
      {
        id: 'app', name: 'App.jsx', path: '/src/App.jsx', type: 'file', language: 'jsx', isNew: true,
        content: `import React from 'react';
import WeatherCard from './components/WeatherCard';
import useWeather from './hooks/useWeather';

function App() {
  const { weather, loading, error } = useWeather('Riyadh');
  if (loading) return <div className="loading">⏳ جاري التحميل...</div>;
  if (error) return <div className="error">❌ خطأ: {error}</div>;
  return (
    <div className="app">
      <header><h1>🌤️ تطبيق الطقس</h1></header>
      <WeatherCard data={weather} />
    </div>
  );
}
export default App;`,
      },
      {
        id: 'components', name: 'components', path: '/src/components', type: 'folder',
        children: [
          {
            id: 'weathercard', name: 'WeatherCard.jsx', path: '/src/components/WeatherCard.jsx',
            type: 'file', language: 'jsx', isNew: true,
            content: `import React from 'react';

const WeatherCard = ({ data }) => {
  if (!data) return null;
  return (
    <div className="weather-card">
      <div className="city">{data.city}</div>
      <div className="temp">{data.temp}°C</div>
      <div className="desc">{data.description}</div>
      <div className="details">
        <span>💨 {data.wind} km/h</span>
        <span>💧 {data.humidity}%</span>
      </div>
    </div>
  );
};
export default WeatherCard;`,
          },
        ],
      },
      {
        id: 'hooks', name: 'hooks', path: '/src/hooks', type: 'folder',
        children: [
          {
            id: 'useweather', name: 'useWeather.js', path: '/src/hooks/useWeather.js',
            type: 'file', language: 'javascript',
            content: `import { useState, useEffect } from 'react';
import { fetchWeather } from '../services/weatherApi';

const useWeather = (city) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchWeather(city);
        setWeather(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [city]);

  return { weather, loading, error };
};
export default useWeather;`,
          },
        ],
      },
    ],
  },
  {
    id: 'pkg', name: 'package.json', path: '/package.json', type: 'file', language: 'json',
    content: `{\n  "name": "weather-app",\n  "version": "1.0.0"\n}`,
  },
];

export const INITIAL_PENDING_CHANGES: PendingChange[] = [
  {
    id: 'pc1', filename: 'WeatherWidget.jsx',
    path: '/src/components/WeatherWidget.jsx',
    content: `import React from 'react';\nexport const WeatherWidget = ({ city, temp }) => (\n  <div className="widget">\n    <span>{city}</span>\n    <strong>{temp}°C</strong>\n  </div>\n);`,
    language: 'jsx', source: 'AI WebView (DeepSeek)',
    timestamp: new Date().toISOString(),
  },
];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  { id: 'ntf1', type: 'success', title: 'تم إنشاء المهام', message: 'تم إنشاء 6 مهام تلقائياً من AI Planner', timestamp: new Date().toISOString(), read: false, screen: 'tasks' },
  { id: 'ntf2', type: 'info', title: 'ملفات جاهزة للمراجعة', message: 'تم توليد WeatherWidget.jsx', timestamp: new Date().toISOString(), read: false, screen: 'workspace' },
  { id: 'ntf3', type: 'warning', title: 'مهمة تنتظر الموافقة', message: 'مهمة "الاختبارات والنشر" تحتاج موافقتك', timestamp: new Date().toISOString(), read: false, screen: 'tasks' },
];

export const INITIAL_SCRIPTS: Script[] = [
  { id: 's1', name: 'Extract Last AI Response', category: 'Extraction', description: 'استخراج آخر رد من AI', tags: ['AI', 'Extract'], code: `const el = document.querySelector('.response-area');\nreturn el ? el.innerText.trim() : '';` },
  { id: 's2', name: 'Wait for Loading Spinner', category: 'Navigation', description: 'انتظار اختفاء مؤشر التحميل', tags: ['Wait', 'Loading'], code: `await waitForSelectorDisappear('.loading-spinner', 30000);` },
  { id: 's3', name: 'Click Send Button', category: 'Interaction', description: 'النقر على زر الإرسال', tags: ['Click', 'AI'], code: `document.querySelector('.send-btn')?.click();` },
  { id: 's4', name: 'Clear Input Field', category: 'Interaction', description: 'مسح حقل الإدخال', tags: ['Input', 'Clear'], code: `const el = document.querySelector('textarea');\nif (el) { el.value = ''; el.dispatchEvent(new Event('input')); }` },
  { id: 's5', name: 'Scroll to Bottom', category: 'Navigation', description: 'التمرير إلى أسفل الصفحة', tags: ['Scroll'], code: `window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });` },
  { id: 's6', name: 'Extract Code Blocks', category: 'Extraction', description: 'استخراج كتل الأكواد', tags: ['Extract', 'Code'], code: `const blocks = document.querySelectorAll('pre code');\nreturn Array.from(blocks).map(b => ({ lang: b.className, code: b.innerText }));` },
  { id: 's7', name: 'Detect AI Streaming', category: 'AI', description: 'الكشف عن توقف تدفق رد AI', tags: ['AI', 'Stream'], code: `const el = document.querySelector('.response-streaming');\nreturn !el || el.dataset.streaming !== 'true';` },
];

export const INITIAL_SELECTORS: Selector[] = [
  { id: 'sel1', name: 'DeepSeek Input', selector: '#chat-input', type: 'input', site: 'deepseek.com', alternatives: ['textarea.chat-input', '[data-testid="chat-textarea"]'] },
  { id: 'sel2', name: 'DeepSeek Send', selector: 'button[data-testid="send-button"]', type: 'send', site: 'deepseek.com', alternatives: ['.send-btn', 'button[aria-label="Send"]'] },
  { id: 'sel3', name: 'DeepSeek Stop', selector: 'button[aria-label="Stop"]', type: 'stop', site: 'deepseek.com', alternatives: ['.stop-btn', '[data-testid="stop-button"]'] },
  { id: 'sel4', name: 'ChatGPT Input', selector: '#prompt-textarea', type: 'input', site: 'chatgpt.com' },
  { id: 'sel5', name: 'ChatGPT Send', selector: 'button[data-testid="fruitjuice-send-button"]', type: 'send', site: 'chatgpt.com' },
  { id: 'sel6', name: 'ChatGPT Response', selector: '[data-message-author-role="assistant"]', type: 'response', site: 'chatgpt.com' },
  { id: 'sel7', name: 'Claude Input', selector: '[data-testid="input-field"]', type: 'input', site: 'claude.ai' },
];

export const INITIAL_RECORDINGS: Recording[] = [
  {
    id: 'r1', name: 'DeepSeek Auto-Chat',
    steps: [
      'انتقل إلى: https://chat.deepseek.com',
      'انتظر ظهور: #chat-input',
      'اكتب في: #chat-input ← "${prompt}"',
      'انقر: button[data-testid="send-button"]',
      'انتظر اختفاء: button[aria-label="Stop"]',
      'استخرج: .response-container:last-child',
    ],
    createdAt: '2026-06-28', duration: '45s',
  },
  {
    id: 'r2', name: 'ChatGPT Code Generator',
    steps: [
      'انتقل إلى: https://chatgpt.com',
      'انتظر ظهور: #prompt-textarea',
      'اكتب في: #prompt-textarea ← "${prompt}"',
      'انقر: button[data-testid="send-button"]',
      'انتظر AI Response Complete',
      'استخرج كتل الأكواد من: pre code',
      'احفظ الملفات في: workspace/output/',
    ],
    createdAt: '2026-06-27', duration: '2m 10s',
  },
];
