/**
 * Python Runner Service
 * Manages Pyodide-based Python execution via WebView bridge
 */

export interface PythonResult {
  success: boolean;
  stdout: string;
  stderr: string;
  result?: any;
  executionTime: number;
}

export interface PythonRunnerBridge {
  execute: (code: string, context?: Record<string, any>) => Promise<PythonResult>;
  isReady: () => boolean;
  getVersion: () => string;
}

// The HTML that loads Pyodide and handles code execution
export const PYODIDE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js"></script>
</head>
<body>
<script>
var pyodide = null;
var ready = false;
var version = "Pyodide 0.25.0 (Python 3.11)";

async function init() {
  try {
    pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
    });
    ready = true;
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
      type: "pyodide_ready", version: version
    }));
  } catch(e) {
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
      type: "pyodide_error", message: e.message
    }));
  }
}

async function runCode(code, context, reqId) {
  if (!ready || !pyodide) {
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
      type: "python_result", id: reqId, success: false,
      stderr: "Pyodide not ready", stdout: "", executionTime: 0
    }));
    return;
  }
  var start = Date.now();
  var stdout = "";
  var stderr = "";
  try {
    // Redirect stdout
    pyodide.runPython(\`
import sys
import io
_stdout_capture = io.StringIO()
_stderr_capture = io.StringIO()
sys.stdout = _stdout_capture
sys.stderr = _stderr_capture
\`);

    // Inject context variables
    if (context && typeof context === 'object') {
      for (var key in context) {
        try {
          pyodide.globals.set(key, context[key]);
        } catch(e) {}
      }
    }

    // Run user code
    var result = pyodide.runPython(code);

    // Capture output
    stdout = pyodide.runPython("_stdout_capture.getvalue()") || "";
    stderr = pyodide.runPython("_stderr_capture.getvalue()") || "";

    // Restore stdout
    pyodide.runPython("sys.stdout = sys.__stdout__; sys.stderr = sys.__stderr__");

    var elapsed = Date.now() - start;
    var resultStr = "";
    try {
      if (result !== undefined && result !== null) {
        resultStr = String(result);
      }
    } catch(e) {}

    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
      type: "python_result", id: reqId, success: true,
      stdout: stdout + (resultStr ? "\\n=> " + resultStr : ""),
      stderr: stderr, executionTime: elapsed
    }));
  } catch(e) {
    try {
      stderr = pyodide.runPython("_stderr_capture.getvalue()") || "";
      pyodide.runPython("sys.stdout = sys.__stdout__; sys.stderr = sys.__stderr__");
    } catch(e2) {}
    var elapsed2 = Date.now() - start;
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
      type: "python_result", id: reqId, success: false,
      stdout: stdout, stderr: stderr || e.message, executionTime: elapsed2
    }));
  }
}

// Listen for messages from React Native
document.addEventListener("message", function(e) {
  handleMessage(e.data);
});
window.addEventListener("message", function(e) {
  handleMessage(e.data);
});

function handleMessage(data) {
  try {
    var msg = typeof data === 'string' ? JSON.parse(data) : data;
    if (msg.type === "run_python") {
      runCode(msg.code, msg.context || {}, msg.id);
    } else if (msg.type === "ping") {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
        type: "pong", ready: ready, version: version
      }));
    }
  } catch(e) {}
}

init();
</script>
</body>
</html>`;

// Pending promise resolvers keyed by request ID
const pendingResolvers = new Map<string, (result: PythonResult) => void>();
let bridgeRef: { current: any } = { current: null };
let isReady = false;
let pyVersion = 'Pyodide (loading...)';

export function createPythonRunner() {
  return {
    setPyodideWebViewRef: (ref: any) => {
      bridgeRef.current = ref;
    },
    handleMessage: (data: string) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'pyodide_ready') {
          isReady = true;
          pyVersion = msg.version || 'Pyodide 0.25.0';
        }
        if (msg.type === 'python_result') {
          const resolver = pendingResolvers.get(msg.id);
          if (resolver) {
            pendingResolvers.delete(msg.id);
            resolver({
              success: msg.success,
              stdout: msg.stdout || '',
              stderr: msg.stderr || '',
              executionTime: msg.executionTime || 0,
            });
          }
        }
      } catch (e) {}
    },
    execute: (code: string, context?: Record<string, any>): Promise<PythonResult> => {
      return new Promise((resolve) => {
        if (!bridgeRef.current) {
          resolve({ success: false, stdout: '', stderr: 'WebView not mounted', executionTime: 0 });
          return;
        }
        const reqId = `py-${Date.now()}-${Math.random()}`;
        pendingResolvers.set(reqId, resolve);
        // Timeout after 30s
        setTimeout(() => {
          if (pendingResolvers.has(reqId)) {
            pendingResolvers.delete(reqId);
            resolve({ success: false, stdout: '', stderr: 'Execution timeout (30s)', executionTime: 30000 });
          }
        }, 30000);
        const msg = JSON.stringify({ type: 'run_python', code, context: context || {}, id: reqId });
        bridgeRef.current.injectJavaScript(`
          (function() {
            window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(msg)} }));
          })(); true;
        `);
      });
    },
    isReady: () => isReady,
    getVersion: () => pyVersion,
    reset: () => {
      isReady = false;
      pendingResolvers.clear();
      bridgeRef.current = null;
    },
  };
}

// Singleton runner
export const pythonRunner = createPythonRunner();

// Python templates for common tasks
export const PYTHON_TEMPLATES = {
  hello: `# Python Hello World
print("مرحباً من Python!")
print("الإصدار:", __import__('sys').version.split()[0])`,

  data_analysis: `# تحليل بيانات بسيط
import json

data = [23, 45, 12, 67, 34, 89, 11, 56, 78, 42]

mean = sum(data) / len(data)
sorted_data = sorted(data)
median = sorted_data[len(data)//2]
max_val = max(data)
min_val = min(data)

result = {
    "count": len(data),
    "mean": round(mean, 2),
    "median": median,
    "max": max_val,
    "min": min_val,
    "range": max_val - min_val,
}

print(json.dumps(result, indent=2, ensure_ascii=False))`,

  string_processing: `# معالجة النصوص
text = """
تطبيق CodeForgeAI هو منصة تطوير ذكية
تجمع بين قوة الذكاء الاصطناعي وأتمتة المتصفح
لبناء مشاريع برمجية كاملة تلقائياً
"""

words = text.split()
unique_words = set(words)
word_count = len(words)
char_count = len(text.strip())

print(f"عدد الكلمات: {word_count}")
print(f"كلمات فريدة: {len(unique_words)}")
print(f"عدد الحروف: {char_count}")
print(f"أطول كلمة: {max(words, key=len)}")`,

  fibonacci: `# متتالية فيبوناتشي
def fibonacci(n):
    if n <= 1:
        return n
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b

# طباعة أول 15 رقم
fib_seq = [fibonacci(i) for i in range(15)]
print("متتالية فيبوناتشي:", fib_seq)
print("المجموع:", sum(fib_seq))`,

  api_scraper: `# محاكاة معالجة بيانات API
import json
import math

# بيانات محاكاة من API
tasks_data = [
    {"id": 1, "title": "تخطيط", "priority": "high", "minutes": 10},
    {"id": 2, "title": "تطوير", "priority": "high", "minutes": 45},
    {"id": 3, "title": "اختبار", "priority": "medium", "minutes": 20},
    {"id": 4, "title": "نشر", "priority": "low", "minutes": 15},
]

total_time = sum(t["minutes"] for t in tasks_data)
high_priority = [t for t in tasks_data if t["priority"] == "high"]

print(f"إجمالي المهام: {len(tasks_data)}")
print(f"الوقت الكلي: {total_time} دقيقة ({math.ceil(total_time/60)} ساعة)")
print(f"مهام عالية الأولوية: {len(high_priority)}")
print("\\nالمهام:", json.dumps([t['title'] for t in tasks_data], ensure_ascii=False))`,

  context_script: `# سكريبت يستخدم بيانات السياق
# المتغيرات المُمررة: project_idea, task_title, files_count

# يمكن الوصول لمتغيرات السياق مباشرة
idea = globals().get('project_idea', 'غير محدد')
task = globals().get('task_title', 'غير محدد')
files = globals().get('files_count', 0)

print(f"المشروع: {idea}")
print(f"المهمة الحالية: {task}")
print(f"عدد الملفات: {files}")

# منطق معالجة
result = {
    "processed": True,
    "idea_length": len(idea),
    "task_words": len(task.split()),
    "files_count": files,
}

import json
print("\\nالنتيجة:", json.dumps(result, ensure_ascii=False, indent=2))`,
};
