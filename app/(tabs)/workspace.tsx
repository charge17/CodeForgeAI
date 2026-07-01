import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  TextInput, Platform, Modal, Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useApp } from '@/hooks/useApp';
import NotificationCenter from '@/components/common/NotificationCenter';
import ThemeSwitcher from '@/components/common/ThemeSwitcher';
import { FileNode, STARTER_KITS, StarterKit } from '@/services/mockData';

type SideTab = 'explorer' | 'search' | 'git' | 'projects';

const LANG_COLOR: Record<string, string> = {
  jsx: '#61DAFB', tsx: '#61DAFB', js: '#F0DB4F', ts: '#3178C6',
  json: '#FFB547', css: '#264DE4', html: '#E44D26', md: '#7C4DFF',
  py: '#3776AB', vue: '#42b883', sql: '#F29111', sh: '#89E051',
};

const LANG_ICON: Record<string, string> = {
  jsx: 'react', tsx: 'react', js: 'language-javascript', ts: 'language-typescript',
  json: 'code-json', css: 'language-css3', html: 'language-html5', md: 'language-markdown',
  py: 'language-python', vue: 'vuejs', sql: 'database', sh: 'console',
};

interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  files: FileNode[];
  gitRemote?: string;
  branch: string;
}

export default function WorkspaceScreen() {
  const insets = useSafeAreaInsets();
  const {
    files, activeFile, setActiveFile, addFile, addNotification,
    pendingChanges, acceptChange, rejectChange, acceptAllChanges,
    notifications, unreadCount, markNotificationRead, clearNotifications,
    themeName, setThemeName, navigateToTab,
  } = useApp();

  const [sideTab, setSideTab] = useState<SideTab>('explorer');
  const [showSide, setShowSide] = useState(true);
  const [openTabs, setOpenTabs] = useState<FileNode[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [showPending, setShowPending] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [showStarterKits, setShowStarterKits] = useState(false);
  const [showNewFile, setShowNewFile] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showGitHub, setShowGitHub] = useState(false);
  const [showImportGit, setShowImportGit] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [gitRemoteUrl, setGitRemoteUrl] = useState('');
  const [importGitUrl, setImportGitUrl] = useState('');
  const [currentBranch, setCurrentBranch] = useState('main');
  const [commitMsg, setCommitMsg] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'components', 'hooks']));

  // Projects management
  const [projects, setProjects] = useState<Project[]>([
    {
      id: 'p1', name: 'Weather App', description: 'تطبيق طقس بـ React',
      createdAt: '2026-06-28', files: [], gitRemote: 'https://github.com/user/weather-app', branch: 'main',
    },
  ]);
  const [activeProject, setActiveProject] = useState<Project | null>(projects[0]);
  const [selectedFile, setSelectedFileForOp] = useState<FileNode | null>(null);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [searchResults, setSearchResults] = useState<{ file: FileNode; lines: string[] }[]>([]);

  const handleSelectFile = useCallback((file: FileNode) => {
    if (file.type !== 'file') {
      setExpandedFolders(prev => {
        const next = new Set(prev);
        if (next.has(file.id)) next.delete(file.id);
        else next.add(file.id);
        return next;
      });
      return;
    }
    setActiveFile(file);
    setEditorContent(file.content || '');
    setOpenTabs(prev => prev.find(t => t.id === file.id) ? prev : [...prev, file]);
  }, [setActiveFile]);

  const closeTab = (fileId: string) => {
    const newTabs = openTabs.filter(t => t.id !== fileId);
    setOpenTabs(newTabs);
    if (activeFile?.id === fileId) {
      const last = newTabs[newTabs.length - 1] || null;
      setActiveFile(last);
      setEditorContent(last?.content || '');
    }
  };

  const handleStarterKit = (kit: StarterKit) => {
    kit.files.forEach((f, i) => {
      const parts = f.path.split('/');
      const name = parts[parts.length - 1];
      const ext = name.split('.').pop() || '';
      addFile({ id: `sk${Date.now()}-${i}`, name, path: f.path, type: 'file', content: f.content, language: ext, isNew: true });
    });
    setShowStarterKits(false);
    addNotification({ type: 'success', title: `${kit.name} Starter Kit`, message: `تم إضافة ${kit.files.length} ملفات`, screen: 'workspace' });
  };

  const createNewFile = () => {
    if (!newFileName.trim()) return;
    const name = newFileName.trim();
    const ext = name.split('.').pop() || 'txt';
    const file: FileNode = {
      id: `f${Date.now()}`, name, path: `/src/${name}`, type: 'file',
      content: `// ${name}\n`, language: ext, isNew: true,
    };
    addFile(file);
    handleSelectFile(file);
    setNewFileName('');
    setShowNewFile(false);
    addNotification({ type: 'success', title: 'ملف جديد', message: name, screen: 'workspace' });
  };

  const createNewFolder = () => {
    if (!newFolderName.trim()) return;
    const name = newFolderName.trim();
    const folder: FileNode = { id: `d${Date.now()}`, name, path: `/src/${name}`, type: 'folder', children: [] };
    addFile(folder);
    setNewFolderName('');
    setShowNewFolder(false);
    addNotification({ type: 'success', title: 'مجلد جديد', message: name, screen: 'workspace' });
  };

  const createNewProject = () => {
    if (!newProjectName.trim()) return;
    const p: Project = {
      id: `p${Date.now()}`, name: newProjectName.trim(),
      description: newProjectDesc.trim() || 'مشروع جديد',
      createdAt: new Date().toISOString().split('T')[0],
      files: [], branch: 'main',
    };
    setProjects(prev => [p, ...prev]);
    setActiveProject(p);
    setNewProjectName(''); setNewProjectDesc('');
    setShowNewProject(false);
    addNotification({ type: 'success', title: 'مشروع جديد', message: p.name, screen: 'workspace' });
  };

  const exportToGitHub = () => {
    if (!gitRemoteUrl.trim()) return;
    setActiveProject(prev => prev ? { ...prev, gitRemote: gitRemoteUrl } : prev);
    addNotification({
      type: 'success', title: 'تصدير GitHub',
      message: `تم ربط المشروع بـ ${gitRemoteUrl}`, screen: 'workspace',
    });
    setShowGitHub(false);
    setGitRemoteUrl('');
  };

  const importFromGit = () => {
    if (!importGitUrl.trim()) return;
    addNotification({ type: 'info', title: 'استيراد Git', message: `جارٍ استيراد ${importGitUrl}`, screen: 'workspace' });
    setShowImportGit(false);
    setImportGitUrl('');
  };

  const deleteFile = (file: FileNode) => {
    addNotification({ type: 'warning', title: 'تم الحذف', message: file.name, screen: 'workspace' });
    if (activeFile?.id === file.id) {
      setActiveFile(null);
      setEditorContent('');
      setOpenTabs(prev => prev.filter(t => t.id !== file.id));
    }
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    const results: { file: FileNode; lines: string[] }[] = [];
    const searchInNodes = (nodes: FileNode[]) => {
      nodes.forEach(node => {
        if (node.type === 'file' && node.content) {
          const lines = node.content.split('\n')
            .filter(l => l.toLowerCase().includes(q.toLowerCase()))
            .slice(0, 3);
          if (lines.length > 0 || node.name.toLowerCase().includes(q.toLowerCase())) {
            results.push({ file: node, lines });
          }
        }
        if (node.children) searchInNodes(node.children);
      });
    };
    searchInNodes(files);
    setSearchResults(results);
  };

  const doCommit = () => {
    if (!commitMsg.trim()) return;
    addNotification({ type: 'success', title: 'Git Commit', message: commitMsg, screen: 'workspace' });
    setCommitMsg('');
  };

  const ext = activeFile?.name.split('.').pop() || '';
  const langColor = LANG_COLOR[ext] || Colors.textDim;
  const langIcon = LANG_ICON[ext] || 'file-outline';
  const lineCount = editorContent.split('\n').length;
  const charCount = editorContent.length;

  // Flat file list for rendering
  const flatFiles = useCallback((nodes: FileNode[], depth = 0): { node: FileNode; depth: number }[] => {
    const result: { node: FileNode; depth: number }[] = [];
    nodes.forEach(node => {
      result.push({ node, depth });
      if (node.type === 'folder' && node.children && expandedFolders.has(node.id)) {
        result.push(...flatFiles(node.children, depth + 1));
      }
    });
    return result;
  }, [expandedFolders]);

  const flatList = flatFiles(files);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="code-braces" size={18} color={Colors.primary} />
          <Text style={styles.headerTitle}>Workspace</Text>
          {activeProject && (
            <View style={styles.projectBadge}>
              <MaterialCommunityIcons name="folder-open" size={11} color={Colors.accent} />
              <Text style={styles.projectBadgeText}>{activeProject.name}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          {pendingChanges.length > 0 && (
            <Pressable onPress={() => setShowPending(v => !v)}
              style={[styles.hBtn, showPending && styles.hBtnActive, { backgroundColor: Colors.warningDim }]}>
              <MaterialCommunityIcons name="file-clock" size={15} color={Colors.warning} />
              <View style={styles.badge}><Text style={styles.badgeText}>{pendingChanges.length}</Text></View>
            </Pressable>
          )}
          <Pressable onPress={() => setShowNotif(v => !v)} style={styles.hBtn}>
            <MaterialCommunityIcons name="bell" size={15} color={unreadCount > 0 ? Colors.warning : Colors.textMuted} />
            {unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>}
          </Pressable>
          <Pressable onPress={() => setShowTheme(v => !v)} style={styles.hBtn}>
            <MaterialCommunityIcons name="palette" size={15} color={Colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => setShowGitHub(true)} style={styles.hBtn}>
            <MaterialCommunityIcons name="github" size={15} color={Colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => setShowStarterKits(true)} style={styles.hBtn}>
            <MaterialCommunityIcons name="package-variant" size={15} color={Colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => setShowSide(v => !v)} style={[styles.hBtn, !showSide && styles.hBtnActive]}>
            <MaterialCommunityIcons name="view-split-vertical" size={15} color={showSide ? Colors.primary : Colors.textMuted} />
          </Pressable>
        </View>
      </View>

      {showNotif && <NotificationCenter notifications={notifications} onMarkRead={markNotificationRead} onClear={clearNotifications} onClose={() => setShowNotif(false)} />}
      {showTheme && <ThemeSwitcher current={themeName} onSelect={n => { setThemeName(n); setShowTheme(false); }} onClose={() => setShowTheme(false)} />}

      {/* Pending panel */}
      {showPending && pendingChanges.length > 0 && (
        <View style={styles.pendingPanel}>
          <View style={styles.pendingHeader}>
            <MaterialCommunityIcons name="file-clock" size={14} color={Colors.warning} />
            <Text style={styles.pendingTitle}>تغييرات AI معلقة ({pendingChanges.length})</Text>
            <Pressable onPress={acceptAllChanges} style={styles.acceptAllBtn}>
              <Text style={styles.acceptAllText}>قبول الكل</Text>
            </Pressable>
            <Pressable onPress={() => setShowPending(false)}>
              <MaterialCommunityIcons name="close" size={14} color={Colors.textDim} />
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 130 }} showsVerticalScrollIndicator={false}>
            {pendingChanges.map(ch => (
              <View key={ch.id} style={styles.pendingItem}>
                <View style={[styles.langPill, { backgroundColor: (LANG_COLOR[ch.language] || Colors.primary) + '20' }]}>
                  <Text style={[styles.langPillText, { color: LANG_COLOR[ch.language] || Colors.primary }]}>{ch.language}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pendingName}>{ch.filename}</Text>
                  <Text style={styles.pendingSource}>{ch.source}</Text>
                </View>
                <Pressable onPress={() => acceptChange(ch.id)} style={styles.acceptBtn}>
                  <MaterialCommunityIcons name="check" size={13} color={Colors.success} />
                </Pressable>
                <Pressable onPress={() => rejectChange(ch.id)} style={styles.rejectBtn}>
                  <MaterialCommunityIcons name="close" size={13} color={Colors.error} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.body}>
        {/* Activity bar */}
        <View style={styles.activityBar}>
          {([
            { key: 'projects', icon: 'folder-multiple' },
            { key: 'explorer', icon: 'file-tree' },
            { key: 'search', icon: 'magnify' },
            { key: 'git', icon: 'source-branch' },
          ] as { key: SideTab; icon: string }[]).map(item => (
            <Pressable key={item.key}
              onPress={() => { setSideTab(item.key); setShowSide(true); }}
              style={[styles.activityItem, sideTab === item.key && showSide && styles.activityItemActive]}>
              <MaterialCommunityIcons name={item.icon as any} size={22}
                color={sideTab === item.key && showSide ? Colors.primary : Colors.textDim} />
            </Pressable>
          ))}
        </View>

        {/* Side panel */}
        {showSide && (
          <View style={styles.sidePanel}>
            {/* ── PROJECTS ── */}
            {sideTab === 'projects' && (
              <View style={{ flex: 1 }}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>PROJECTS</Text>
                  <Pressable onPress={() => setShowNewProject(true)} style={styles.panelAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="plus" size={16} color={Colors.primary} />
                  </Pressable>
                  <Pressable onPress={() => setShowImportGit(true)} style={styles.panelAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="source-repository-multiple" size={14} color={Colors.textDim} />
                  </Pressable>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {projects.map(p => (
                    <Pressable key={p.id} onPress={() => setActiveProject(p)}
                      style={[styles.projectItem, activeProject?.id === p.id && styles.projectItemActive]}>
                      <View style={[styles.projectIconWrap, activeProject?.id === p.id && { backgroundColor: Colors.primaryDim }]}>
                        <MaterialCommunityIcons name="folder-open" size={18} color={activeProject?.id === p.id ? Colors.primary : Colors.textDim} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.projectName, activeProject?.id === p.id && { color: Colors.primary }]}>{p.name}</Text>
                        <Text style={styles.projectDesc} numberOfLines={1}>{p.description}</Text>
                        <View style={styles.projectMeta}>
                          <MaterialCommunityIcons name="source-branch" size={9} color={Colors.success} />
                          <Text style={styles.projectMetaText}>{p.branch}</Text>
                          {p.gitRemote && (
                            <>
                              <MaterialCommunityIcons name="github" size={9} color={Colors.textDim} />
                              <Text style={styles.projectMetaText}>Linked</Text>
                            </>
                          )}
                        </View>
                      </View>
                      {activeProject?.id === p.id && (
                        <View style={styles.activeProjectDot} />
                      )}
                    </Pressable>
                  ))}
                  <Pressable onPress={() => setShowStarterKits(true)} style={styles.starterKitRow}>
                    <MaterialCommunityIcons name="package-variant-plus" size={14} color={Colors.accent} />
                    <Text style={styles.starterKitRowText}>Starter Kit...</Text>
                  </Pressable>
                </ScrollView>
              </View>
            )}

            {/* ── EXPLORER ── */}
            {sideTab === 'explorer' && (
              <View style={{ flex: 1 }}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>EXPLORER</Text>
                  <Pressable onPress={() => setShowNewFile(true)} style={styles.panelAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="file-plus-outline" size={15} color={Colors.textDim} />
                  </Pressable>
                  <Pressable onPress={() => setShowNewFolder(true)} style={styles.panelAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialCommunityIcons name="folder-plus-outline" size={15} color={Colors.textDim} />
                  </Pressable>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {flatList.map(({ node, depth }) => {
                    const nodeExt = node.name.split('.').pop() || '';
                    const nodeColor = node.type === 'folder' ? Colors.warning : (LANG_COLOR[nodeExt] || Colors.textDim);
                    const isExpanded = expandedFolders.has(node.id);
                    return (
                      <Pressable key={node.id}
                        onPress={() => handleSelectFile(node)}
                        onLongPress={() => { setSelectedFileForOp(node); setShowFileMenu(true); }}
                        style={({ pressed }) => [
                          styles.fileRow,
                          { paddingLeft: Spacing.sm + depth * 14 },
                          activeFile?.id === node.id && styles.fileRowActive,
                          pressed && styles.fileRowPressed,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={node.type === 'folder'
                            ? (isExpanded ? 'folder-open' : 'folder')
                            : (LANG_ICON[nodeExt] as any || 'file-outline')}
                          size={15} color={nodeColor}
                        />
                        <Text style={[styles.fileName, activeFile?.id === node.id && { color: Colors.text }]} numberOfLines={1}>
                          {node.name}
                        </Text>
                        {node.isNew && <View style={[styles.newBadge, { backgroundColor: Colors.success }]} />}
                        {node.type === 'folder' && (
                          <MaterialCommunityIcons name={isExpanded ? 'chevron-down' : 'chevron-right'} size={12} color={Colors.textDim} />
                        )}
                      </Pressable>
                    );
                  })}
                  {files.length === 0 && (
                    <View style={styles.emptyExplorer}>
                      <MaterialCommunityIcons name="folder-open" size={32} color={Colors.textDim} />
                      <Text style={styles.emptyExplorerText}>لا يوجد ملفات</Text>
                      <Pressable onPress={() => setShowNewFile(true)} style={styles.emptyExplorerBtn}>
                        <Text style={styles.emptyExplorerBtnText}>+ ملف جديد</Text>
                      </Pressable>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}

            {/* ── SEARCH ── */}
            {sideTab === 'search' && (
              <View style={{ flex: 1 }}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>SEARCH</Text>
                </View>
                <View style={styles.searchBox}>
                  <MaterialCommunityIcons name="magnify" size={14} color={Colors.textMuted} />
                  <TextInput value={searchQuery} onChangeText={handleSearch}
                    placeholder="بحث في الملفات..." placeholderTextColor={Colors.textDim}
                    style={styles.searchInput} autoCapitalize="none" />
                  {searchQuery.length > 0 && (
                    <Pressable onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                      <MaterialCommunityIcons name="close-circle" size={14} color={Colors.textDim} />
                    </Pressable>
                  )}
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {searchResults.length > 0 ? (
                    searchResults.map(r => (
                      <Pressable key={r.file.id} onPress={() => handleSelectFile(r.file)} style={styles.searchResult}>
                        <View style={styles.searchResultHeader}>
                          <MaterialCommunityIcons name="file-outline" size={12} color={LANG_COLOR[r.file.name.split('.').pop() || ''] || Colors.textDim} />
                          <Text style={styles.searchResultFile}>{r.file.name}</Text>
                          <Text style={styles.searchResultPath} numberOfLines={1}>{r.file.path}</Text>
                        </View>
                        {r.lines.map((line, i) => (
                          <Text key={i} style={styles.searchResultLine} numberOfLines={1}>  {line.trim()}</Text>
                        ))}
                      </Pressable>
                    ))
                  ) : searchQuery.length > 0 ? (
                    <Text style={styles.searchNoResult}>لا نتائج لـ "{searchQuery}"</Text>
                  ) : null}
                </ScrollView>
              </View>
            )}

            {/* ── GIT ── */}
            {sideTab === 'git' && (
              <View style={{ flex: 1 }}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>SOURCE CONTROL</Text>
                  <Pressable onPress={() => setShowGitHub(true)} style={styles.panelAction}>
                    <MaterialCommunityIcons name="github" size={14} color={Colors.textDim} />
                  </Pressable>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 0 }}>
                  <View style={styles.gitBranchSection}>
                    <MaterialCommunityIcons name="source-branch" size={14} color={Colors.success} />
                    <Text style={styles.gitBranchName}>{currentBranch}</Text>
                    {activeProject?.gitRemote && (
                      <View style={styles.gitLinkedBadge}>
                        <MaterialCommunityIcons name="github" size={9} color={Colors.textDim} />
                        <Text style={styles.gitLinkedText}>linked</Text>
                      </View>
                    )}
                  </View>

                  {/* Commit */}
                  <View style={styles.gitCommitSection}>
                    <Text style={styles.gitSectionLabel}>Commit Message</Text>
                    <TextInput value={commitMsg} onChangeText={setCommitMsg}
                      placeholder="feat: أضف تحسينات..." placeholderTextColor={Colors.textDim}
                      style={styles.gitCommitInput} multiline numberOfLines={2} textAlignVertical="top" />
                    <Pressable onPress={doCommit} disabled={!commitMsg.trim()}
                      style={[styles.gitCommitBtn, !commitMsg.trim() && styles.gitCommitBtnDisabled]}>
                      <MaterialCommunityIcons name="source-commit" size={14} color="#fff" />
                      <Text style={styles.gitCommitBtnText}>Commit & Push</Text>
                    </Pressable>
                  </View>

                  {/* Changed files */}
                  <View style={styles.gitChangedSection}>
                    <Text style={styles.gitSectionLabel}>ملفات متغيرة ({files.filter(f => f.isNew).length})</Text>
                    {files.filter(f => f.isNew && f.type === 'file').slice(0, 8).map(f => (
                      <View key={f.id} style={styles.gitFileRow}>
                        <View style={styles.gitMBadge}><Text style={styles.gitMText}>N</Text></View>
                        <Text style={styles.gitFileName} numberOfLines={1}>{f.name}</Text>
                      </View>
                    ))}
                    {files.filter(f => f.isNew).length === 0 && (
                      <Text style={styles.gitNoChanges}>لا يوجد تغييرات</Text>
                    )}
                  </View>

                  {/* Branches */}
                  <View style={styles.gitChangedSection}>
                    <Text style={styles.gitSectionLabel}>الفروع</Text>
                    {['main', 'develop', 'feature/ai-pipeline'].map(br => (
                      <Pressable key={br} onPress={() => setCurrentBranch(br)} style={styles.gitBranchRow}>
                        <MaterialCommunityIcons name="source-branch" size={11}
                          color={currentBranch === br ? Colors.success : Colors.textDim} />
                        <Text style={[styles.gitBranchText, currentBranch === br && { color: Colors.success }]}>{br}</Text>
                        {currentBranch === br && <MaterialCommunityIcons name="check" size={11} color={Colors.success} />}
                      </Pressable>
                    ))}
                  </View>

                  {/* Git actions */}
                  <View style={styles.gitActionsRow}>
                    <Pressable onPress={() => setShowImportGit(true)} style={styles.gitActionBtn}>
                      <MaterialCommunityIcons name="source-repository-multiple" size={13} color={Colors.primary} />
                      <Text style={styles.gitActionText}>Import</Text>
                    </Pressable>
                    <Pressable onPress={() => setShowGitHub(true)} style={styles.gitActionBtn}>
                      <MaterialCommunityIcons name="github" size={13} color={Colors.textDim} />
                      <Text style={styles.gitActionText}>Export</Text>
                    </Pressable>
                    <Pressable onPress={() => addNotification({ type: 'info', title: 'Git Pull', message: 'جارٍ سحب التغييرات...', screen: 'workspace' })} style={styles.gitActionBtn}>
                      <MaterialCommunityIcons name="arrow-down-circle-outline" size={13} color={Colors.textDim} />
                      <Text style={styles.gitActionText}>Pull</Text>
                    </Pressable>
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Editor area */}
        <View style={styles.editorArea}>
          {/* Open tabs */}
          {openTabs.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              style={styles.tabsBar} contentContainerStyle={styles.tabsContent}>
              {openTabs.map(tab => {
                const tabExt = tab.name.split('.').pop() || '';
                const tabColor = LANG_COLOR[tabExt] || Colors.textDim;
                const isActive = activeFile?.id === tab.id;
                return (
                  <Pressable key={tab.id} onPress={() => handleSelectFile(tab)}
                    style={[styles.editorTab, isActive && styles.editorTabActive]}>
                    <MaterialCommunityIcons name={(LANG_ICON[tabExt] || 'file-outline') as any} size={11} color={isActive ? tabColor : Colors.textDim} />
                    <Text style={[styles.editorTabName, isActive && styles.editorTabNameActive]} numberOfLines={1}>
                      {tab.name}
                    </Text>
                    {tab.isNew && <View style={styles.newDot} />}
                    <Pressable onPress={() => closeTab(tab.id)} style={styles.tabCloseBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <MaterialCommunityIcons name="close" size={11} color={Colors.textDim} />
                    </Pressable>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Breadcrumb */}
          {activeFile && (
            <View style={styles.breadcrumb}>
              <MaterialCommunityIcons name={(LANG_ICON[ext] || 'file-outline') as any} size={11} color={langColor} />
              <Text style={styles.breadcrumbText}>
                {activeFile.path.split('/').filter(Boolean).join(' › ')}
              </Text>
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => { deleteFile(activeFile); closeTab(activeFile.id); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="trash-can-outline" size={13} color={Colors.error + '80'} />
              </Pressable>
            </View>
          )}

          {/* Code Editor */}
          {activeFile ? (
            <View style={styles.editorWrap}>
              <ScrollView style={styles.lineNums} showsVerticalScrollIndicator={false} scrollEnabled={false}>
                {editorContent.split('\n').map((_, i) => (
                  <Text key={i} style={styles.lineNum}>{i + 1}</Text>
                ))}
              </ScrollView>
              <ScrollView style={styles.codeScroll}>
                <TextInput
                  multiline value={editorContent}
                  onChangeText={text => { setEditorContent(text); }}
                  style={styles.codeInput} scrollEnabled={false}
                  autoCapitalize="none" autoCorrect={false} spellCheck={false}
                  textAlignVertical="top"
                />
              </ScrollView>
            </View>
          ) : (
            /* Welcome */
            <View style={styles.welcome}>
              <MaterialCommunityIcons name="code-braces" size={52} color={Colors.textDim} />
              <Text style={styles.welcomeTitle}>CodeForgeAI Workspace</Text>
              <Text style={styles.welcomeSub}>اختر ملفاً أو أنشئ مشروعاً جديداً</Text>
              <View style={styles.welcomeActions}>
                <Pressable onPress={() => setShowNewFile(true)} style={styles.welcomeBtn}>
                  <MaterialCommunityIcons name="file-plus-outline" size={16} color={Colors.primary} />
                  <Text style={styles.welcomeBtnText}>ملف جديد</Text>
                </Pressable>
                <Pressable onPress={() => setShowNewProject(true)} style={styles.welcomeBtn}>
                  <MaterialCommunityIcons name="folder-plus" size={16} color={Colors.accent} />
                  <Text style={[styles.welcomeBtnText, { color: Colors.accent }]}>مشروع جديد</Text>
                </Pressable>
                <Pressable onPress={() => setShowStarterKits(true)} style={styles.welcomeBtn}>
                  <MaterialCommunityIcons name="package-variant" size={16} color={Colors.success} />
                  <Text style={[styles.welcomeBtnText, { color: Colors.success }]}>Starter Kit</Text>
                </Pressable>
                <Pressable onPress={() => setShowImportGit(true)} style={styles.welcomeBtn}>
                  <MaterialCommunityIcons name="source-repository-multiple" size={16} color={Colors.warning} />
                  <Text style={[styles.welcomeBtnText, { color: Colors.warning }]}>Import Git</Text>
                </Pressable>
              </View>
              <View style={styles.welcomeTips}>
                {[
                  { icon: 'robot', text: 'الملفات تُنشأ تلقائياً عبر AI Pipeline' },
                  { icon: 'github', text: 'تصدير/استيراد من GitHub مباشرة' },
                  { icon: 'source-branch', text: 'إدارة الفروع والـ Commits' },
                ].map(tip => (
                  <View key={tip.text} style={styles.welcomeTip}>
                    <MaterialCommunityIcons name={tip.icon as any} size={13} color={Colors.primary} />
                    <Text style={styles.welcomeTipText}>{tip.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Status bar */}
      <View style={[styles.statusBar, { paddingBottom: Math.max(insets.bottom - 60, 4) }]}>
        <View style={styles.statusLeft}>
          <MaterialCommunityIcons name="source-branch" size={11} color={Colors.success} />
          <Text style={styles.statusText}>{currentBranch}</Text>
          {activeProject?.gitRemote && (
            <>
              <Text style={styles.statusSep}>•</Text>
              <MaterialCommunityIcons name="github" size={11} color={Colors.textDim} />
              <Text style={styles.statusText}>linked</Text>
            </>
          )}
          {pendingChanges.length > 0 && (
            <>
              <Text style={styles.statusSep}>•</Text>
              <Text style={[styles.statusText, { color: Colors.warning }]}>{pendingChanges.length} معلق</Text>
            </>
          )}
        </View>
        <View style={styles.statusRight}>
          {activeFile && (
            <>
              <MaterialCommunityIcons name={(LANG_ICON[ext] || 'file-outline') as any} size={11} color={langColor} />
              <Text style={[styles.statusText, { color: langColor }]}>{ext.toUpperCase()}</Text>
              <Text style={styles.statusSep}>•</Text>
              <Text style={styles.statusText}>{lineCount} سطر</Text>
              <Text style={styles.statusSep}>•</Text>
              <Text style={styles.statusText}>{charCount} حرف</Text>
            </>
          )}
          <Text style={styles.statusText}>UTF-8</Text>
        </View>
      </View>

      {/* ── MODALS ── */}

      {/* New File */}
      <Modal visible={showNewFile} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.miniModal}>
            <Text style={styles.miniModalTitle}>ملف جديد</Text>
            <TextInput value={newFileName} onChangeText={setNewFileName}
              placeholder="مثال: Component.jsx" placeholderTextColor={Colors.textDim}
              style={styles.miniInput} autoFocus autoCapitalize="none" autoCorrect={false}
              onSubmitEditing={createNewFile} />
            <View style={styles.miniModalActions}>
              <Pressable onPress={() => setShowNewFile(false)} style={styles.miniCancelBtn}>
                <Text style={styles.miniCancelText}>إلغاء</Text>
              </Pressable>
              <Pressable onPress={createNewFile} disabled={!newFileName.trim()}
                style={[styles.miniConfirmBtn, !newFileName.trim() && { opacity: 0.4 }]}>
                <Text style={styles.miniConfirmText}>إنشاء</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* New Folder */}
      <Modal visible={showNewFolder} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.miniModal}>
            <Text style={styles.miniModalTitle}>مجلد جديد</Text>
            <TextInput value={newFolderName} onChangeText={setNewFolderName}
              placeholder="مثال: components" placeholderTextColor={Colors.textDim}
              style={styles.miniInput} autoFocus autoCapitalize="none"
              onSubmitEditing={createNewFolder} />
            <View style={styles.miniModalActions}>
              <Pressable onPress={() => setShowNewFolder(false)} style={styles.miniCancelBtn}>
                <Text style={styles.miniCancelText}>إلغاء</Text>
              </Pressable>
              <Pressable onPress={createNewFolder} disabled={!newFolderName.trim()}
                style={[styles.miniConfirmBtn, !newFolderName.trim() && { opacity: 0.4 }]}>
                <Text style={styles.miniConfirmText}>إنشاء</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* New Project */}
      <Modal visible={showNewProject} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="folder-plus" size={18} color={Colors.primary} />
              <Text style={styles.modalTitle}>مشروع جديد</Text>
              <Pressable onPress={() => setShowNewProject(false)} style={{ marginLeft: 'auto' as any }}>
                <MaterialCommunityIcons name="close" size={20} color={Colors.textMuted} />
              </Pressable>
            </View>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>اسم المشروع *</Text>
              <TextInput value={newProjectName} onChangeText={setNewProjectName}
                placeholder="My Awesome App" placeholderTextColor={Colors.textDim}
                style={styles.fieldInput} autoFocus />
            </View>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>الوصف</Text>
              <TextInput value={newProjectDesc} onChangeText={setNewProjectDesc}
                placeholder="وصف المشروع..." placeholderTextColor={Colors.textDim}
                style={styles.fieldInput} />
            </View>
            <Pressable onPress={createNewProject} disabled={!newProjectName.trim()}
              style={[styles.submitBtn, !newProjectName.trim() && { opacity: 0.4 }]}>
              <MaterialCommunityIcons name="plus" size={16} color="#fff" />
              <Text style={styles.submitBtnText}>إنشاء المشروع</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* GitHub Export */}
      <Modal visible={showGitHub} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="github" size={18} color={Colors.text} />
              <Text style={styles.modalTitle}>تصدير إلى GitHub</Text>
              <Pressable onPress={() => setShowGitHub(false)} style={{ marginLeft: 'auto' as any }}>
                <MaterialCommunityIcons name="close" size={20} color={Colors.textMuted} />
              </Pressable>
            </View>
            {activeProject?.gitRemote && (
              <View style={styles.gitCurrentRemote}>
                <MaterialCommunityIcons name="link-variant" size={13} color={Colors.success} />
                <Text style={styles.gitCurrentRemoteText} numberOfLines={1}>{activeProject.gitRemote}</Text>
              </View>
            )}
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Remote URL</Text>
              <TextInput value={gitRemoteUrl} onChangeText={setGitRemoteUrl}
                placeholder="https://github.com/username/repo" placeholderTextColor={Colors.textDim}
                style={styles.fieldInput} autoCapitalize="none" keyboardType="url" />
            </View>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Commit Message</Text>
              <TextInput value={commitMsg} onChangeText={setCommitMsg}
                placeholder="Initial commit" placeholderTextColor={Colors.textDim}
                style={styles.fieldInput} />
            </View>
            <View style={styles.githubActions}>
              <Pressable onPress={exportToGitHub} style={styles.submitBtn}>
                <MaterialCommunityIcons name="upload" size={16} color="#fff" />
                <Text style={styles.submitBtnText}>Push إلى GitHub</Text>
              </Pressable>
              <Pressable onPress={() => addNotification({ type: 'info', title: 'Git Pull', message: 'سحب آخر التغييرات من Remote', screen: 'workspace' })}
                style={styles.secondaryBtn}>
                <MaterialCommunityIcons name="download" size={16} color={Colors.primary} />
                <Text style={styles.secondaryBtnText}>Pull من GitHub</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Import from Git */}
      <Modal visible={showImportGit} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="source-repository-multiple" size={18} color={Colors.warning} />
              <Text style={styles.modalTitle}>استيراد من Git</Text>
              <Pressable onPress={() => setShowImportGit(false)} style={{ marginLeft: 'auto' as any }}>
                <MaterialCommunityIcons name="close" size={20} color={Colors.textMuted} />
              </Pressable>
            </View>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Repository URL *</Text>
              <TextInput value={importGitUrl} onChangeText={setImportGitUrl}
                placeholder="https://github.com/user/repo.git" placeholderTextColor={Colors.textDim}
                style={styles.fieldInput} autoCapitalize="none" keyboardType="url" autoFocus />
            </View>
            <Text style={styles.importNote}>
              ملاحظة: سيتم استيراد هيكل الملفات من المستودع وعرضها في المستكشف.
            </Text>
            <Pressable onPress={importFromGit} disabled={!importGitUrl.trim()}
              style={[styles.submitBtn, !importGitUrl.trim() && { opacity: 0.4 }]}>
              <MaterialCommunityIcons name="source-repository-multiple" size={16} color="#fff" />
              <Text style={styles.submitBtnText}>استيراد</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* File context menu */}
      <Modal visible={showFileMenu && !!selectedFile} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowFileMenu(false)}>
          <View style={styles.fileMenu}>
            <Text style={styles.fileMenuTitle}>{selectedFile?.name}</Text>
            <Pressable onPress={() => { if (selectedFile) handleSelectFile(selectedFile); setShowFileMenu(false); }} style={styles.fileMenuItem}>
              <MaterialCommunityIcons name="pencil" size={15} color={Colors.primary} />
              <Text style={styles.fileMenuItemText}>فتح للتحرير</Text>
            </Pressable>
            <Pressable onPress={() => {
              addNotification({ type: 'info', title: 'نسخ المسار', message: selectedFile?.path || '', screen: 'workspace' });
              setShowFileMenu(false);
            }} style={styles.fileMenuItem}>
              <MaterialCommunityIcons name="content-copy" size={15} color={Colors.textDim} />
              <Text style={styles.fileMenuItemText}>نسخ المسار</Text>
            </Pressable>
            <Pressable onPress={() => {
              if (selectedFile) deleteFile(selectedFile);
              setShowFileMenu(false);
            }} style={[styles.fileMenuItem, { borderTopWidth: 1, borderTopColor: Colors.border }]}>
              <MaterialCommunityIcons name="trash-can-outline" size={15} color={Colors.error} />
              <Text style={[styles.fileMenuItemText, { color: Colors.error }]}>حذف</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Starter Kits */}
      <Modal visible={showStarterKits} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="package-variant" size={18} color={Colors.primary} />
              <Text style={styles.modalTitle}>Starter Kits</Text>
              <Pressable onPress={() => setShowStarterKits(false)} style={{ marginLeft: 'auto' as any }}>
                <MaterialCommunityIcons name="close" size={20} color={Colors.textMuted} />
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>اختر هيكلاً جاهزاً لمشروعك</Text>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <View style={styles.kitsGrid}>
                {STARTER_KITS.map(kit => (
                  <Pressable key={kit.id} onPress={() => handleStarterKit(kit)}
                    style={({ pressed }) => [styles.kitCard, pressed && { opacity: 0.85 }]}>
                    <View style={[styles.kitIcon, { backgroundColor: kit.color + '20' }]}>
                      <MaterialCommunityIcons name={kit.icon as any} size={22} color={kit.color} />
                    </View>
                    <Text style={styles.kitName}>{kit.name}</Text>
                    <Text style={styles.kitDesc}>{kit.description}</Text>
                    <Text style={styles.kitFiles}>{kit.files.length} ملفات</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  headerTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  projectBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.accentDim, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
    borderWidth: 1, borderColor: Colors.accent + '40',
  },
  projectBadgeText: { color: Colors.accent, fontSize: 9, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  hBtn: { width: 28, height: 28, borderRadius: Radius.sm, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  hBtnActive: { backgroundColor: Colors.primaryDim },
  badge: { position: 'absolute', top: -3, right: -3, backgroundColor: Colors.error, borderRadius: Radius.full, minWidth: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 8, fontWeight: '800' },

  pendingPanel: { backgroundColor: Colors.warningDim, borderBottomWidth: 1, borderBottomColor: Colors.warning + '40' },
  pendingHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, paddingHorizontal: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.warning + '25' },
  pendingTitle: { color: Colors.warning, fontSize: FontSize.sm, fontWeight: '700', flex: 1 },
  acceptAllBtn: { backgroundColor: Colors.successDim, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: 3, borderWidth: 1, borderColor: Colors.success + '40' },
  acceptAllText: { color: Colors.success, fontSize: FontSize.xs, fontWeight: '700' },
  pendingItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.warning + '15' },
  langPill: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm },
  langPillText: { fontSize: 9, fontWeight: '700' },
  pendingName: { color: Colors.text, fontSize: FontSize.xs, fontWeight: '600' },
  pendingSource: { color: Colors.textDim, fontSize: 9 },
  acceptBtn: { padding: Spacing.xs, backgroundColor: Colors.successDim, borderRadius: Radius.sm },
  rejectBtn: { padding: Spacing.xs, backgroundColor: Colors.errorDim, borderRadius: Radius.sm },

  body: { flex: 1, flexDirection: 'row' },

  activityBar: { width: 44, backgroundColor: Colors.surface, borderRightWidth: 1, borderRightColor: Colors.border, alignItems: 'center', paddingTop: Spacing.md, gap: 4 },
  activityItem: { width: 40, height: 40, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  activityItemActive: { borderLeftWidth: 2, borderLeftColor: Colors.primary, borderRadius: 0 },

  sidePanel: { width: 210, borderRightWidth: 1, borderRightColor: Colors.border, backgroundColor: Colors.surface },

  panelHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.xs },
  panelTitle: { color: Colors.textDim, fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 0.8, flex: 1 },
  panelAction: { padding: 3 },

  // Projects
  projectItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border + '30' },
  projectItemActive: { backgroundColor: Colors.primaryDim + '40' },
  projectIconWrap: { width: 34, height: 34, borderRadius: Radius.md, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center' },
  projectName: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '700' },
  projectDesc: { color: Colors.textDim, fontSize: 9, marginTop: 1 },
  projectMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  projectMetaText: { color: Colors.textDim, fontSize: 9 },
  activeProjectDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  starterKitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, padding: Spacing.md, opacity: 0.7 },
  starterKitRowText: { color: Colors.accent, fontSize: FontSize.xs },

  // File tree
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingRight: Spacing.md, paddingVertical: 5 },
  fileRowActive: { backgroundColor: Colors.primaryDim + '40' },
  fileRowPressed: { backgroundColor: Colors.surface2 },
  fileName: { color: Colors.textDim, fontSize: FontSize.xs, flex: 1 },
  newBadge: { width: 6, height: 6, borderRadius: 3 },

  emptyExplorer: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyExplorerText: { color: Colors.textDim, fontSize: FontSize.xs },
  emptyExplorerBtn: { backgroundColor: Colors.primaryDim, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: 4 },
  emptyExplorerBtnText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: '600' },

  // Search
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.bg, margin: Spacing.sm, paddingHorizontal: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.xs, paddingVertical: Spacing.sm },
  searchResult: { borderBottomWidth: 1, borderBottomColor: Colors.border + '30', padding: Spacing.sm },
  searchResultHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  searchResultFile: { color: Colors.text, fontSize: FontSize.xs, fontWeight: '700' },
  searchResultPath: { color: Colors.textDim, fontSize: 9, flex: 1 },
  searchResultLine: { color: Colors.textMuted, fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', paddingLeft: Spacing.md },
  searchNoResult: { color: Colors.textDim, fontSize: FontSize.xs, padding: Spacing.lg, textAlign: 'center' },

  // Git
  gitBranchSection: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, padding: Spacing.md, backgroundColor: Colors.surface2, borderBottomWidth: 1, borderBottomColor: Colors.border },
  gitBranchName: { color: Colors.success, fontSize: FontSize.sm, fontWeight: '600', flex: 1 },
  gitLinkedBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.surface3, borderRadius: Radius.full, paddingHorizontal: 5, paddingVertical: 1 },
  gitLinkedText: { color: Colors.textDim, fontSize: 9 },
  gitCommitSection: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border + '40', gap: Spacing.sm },
  gitSectionLabel: { color: Colors.textDim, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  gitCommitInput: { backgroundColor: Colors.bg, borderRadius: Radius.sm, padding: Spacing.sm, color: Colors.text, fontSize: FontSize.xs, borderWidth: 1, borderColor: Colors.border, minHeight: 48 },
  gitCommitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, backgroundColor: Colors.primary, borderRadius: Radius.sm, paddingVertical: 6 },
  gitCommitBtnDisabled: { opacity: 0.4 },
  gitCommitBtnText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },
  gitChangedSection: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border + '40', gap: 4 },
  gitFileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: 2 },
  gitMBadge: { width: 14, height: 14, borderRadius: 2, backgroundColor: Colors.success + '30', alignItems: 'center', justifyContent: 'center' },
  gitMText: { color: Colors.success, fontSize: 8, fontWeight: '700' },
  gitFileName: { color: Colors.textMuted, fontSize: FontSize.xs, flex: 1 },
  gitNoChanges: { color: Colors.textDim, fontSize: FontSize.xs },
  gitBranchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: 3 },
  gitBranchText: { color: Colors.textMuted, fontSize: FontSize.xs, flex: 1 },
  gitActionsRow: { flexDirection: 'row', gap: Spacing.xs, padding: Spacing.md },
  gitActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: Colors.surface2, borderRadius: Radius.sm, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  gitActionText: { color: Colors.textDim, fontSize: 9, fontWeight: '600' },

  // Editor area
  editorArea: { flex: 1, backgroundColor: Colors.bg },
  tabsBar: { maxHeight: 34, backgroundColor: Colors.surface2, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabsContent: { alignItems: 'center' },
  editorTab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRightWidth: 1, borderRightColor: Colors.border, maxWidth: 130 },
  editorTabActive: { backgroundColor: Colors.bg, borderBottomWidth: 2, borderBottomColor: Colors.primary },
  editorTabName: { color: Colors.textDim, fontSize: FontSize.xs, flex: 1 },
  editorTabNameActive: { color: Colors.text },
  newDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.success },
  tabCloseBtn: { padding: 2 },

  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.lg, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: Colors.border + '40', backgroundColor: Colors.surface },
  breadcrumbText: { color: Colors.textDim, fontSize: FontSize.xs, flex: 1 },

  editorWrap: { flex: 1, flexDirection: 'row' },
  lineNums: { width: 38, backgroundColor: Colors.bg, paddingTop: Spacing.sm },
  lineNum: { color: Colors.textDim, fontSize: FontSize.xs, textAlign: 'right', paddingRight: Spacing.sm, lineHeight: 20, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  codeScroll: { flex: 1 },
  codeInput: { color: Colors.text, fontSize: FontSize.sm, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 20, padding: Spacing.sm, textAlignVertical: 'top', minHeight: 500 },

  // Welcome screen
  welcome: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  welcomeTitle: { color: Colors.textMuted, fontSize: FontSize.xl, fontWeight: '700' },
  welcomeSub: { color: Colors.textDim, fontSize: FontSize.md },
  welcomeActions: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center', marginTop: Spacing.sm },
  welcomeBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.surface, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  welcomeBtnText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600' },
  welcomeTips: { gap: Spacing.sm, marginTop: Spacing.md, alignSelf: 'stretch' },
  welcomeTip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  welcomeTipText: { color: Colors.textMuted, fontSize: FontSize.sm },

  // Status bar
  statusBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 4, backgroundColor: Colors.primaryDim, borderTopWidth: 1, borderTopColor: Colors.primary + '40' },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  statusRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  statusText: { color: Colors.textMuted, fontSize: FontSize.xs },
  statusSep: { color: Colors.textDim, fontSize: FontSize.xs },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end', alignItems: 'center' },
  miniModal: { width: '90%', backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.md, marginBottom: 200 },
  miniModalTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  miniInput: { backgroundColor: Colors.surface2, borderRadius: Radius.md, padding: Spacing.md, color: Colors.text, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border },
  miniModalActions: { flexDirection: 'row', gap: Spacing.md },
  miniCancelBtn: { flex: 1, alignItems: 'center', padding: Spacing.md, backgroundColor: Colors.surface2, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  miniCancelText: { color: Colors.textMuted, fontSize: FontSize.md },
  miniConfirmBtn: { flex: 1, alignItems: 'center', padding: Spacing.md, backgroundColor: Colors.primary, borderRadius: Radius.md },
  miniConfirmText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },

  modal: { width: '100%', backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: Spacing.lg, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  modalTitle: { color: Colors.text, fontSize: FontSize.xl, fontWeight: '700' },
  modalSubtitle: { color: Colors.textMuted, fontSize: FontSize.md },

  formField: { gap: 6 },
  fieldLabel: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '700' },
  fieldInput: { backgroundColor: Colors.surface2, borderRadius: Radius.md, padding: Spacing.md, color: Colors.text, fontSize: FontSize.md, borderWidth: 1, borderColor: Colors.border },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.lg },
  submitBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primaryDim, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.primary },
  secondaryBtnText: { color: Colors.primary, fontSize: FontSize.md, fontWeight: '700' },

  gitCurrentRemote: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.successDim, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.success + '40' },
  gitCurrentRemoteText: { color: Colors.success, fontSize: FontSize.xs, flex: 1 },
  githubActions: { gap: Spacing.sm },
  importNote: { color: Colors.textDim, fontSize: FontSize.xs, lineHeight: 18, backgroundColor: Colors.surface2, borderRadius: Radius.md, padding: Spacing.md },

  // File menu
  fileMenu: { position: 'absolute', top: '40%', left: '10%', right: '10%', backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  fileMenuTitle: { color: Colors.textDim, fontSize: FontSize.xs, fontWeight: '700', padding: Spacing.sm, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  fileMenuItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  fileMenuItemText: { color: Colors.text, fontSize: FontSize.md },

  // Kits
  kitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, paddingBottom: Spacing.xl },
  kitCard: { width: '47%', backgroundColor: Colors.surface2, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  kitIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  kitName: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  kitDesc: { color: Colors.textMuted, fontSize: FontSize.xs, textAlign: 'center' },
  kitFiles: { color: Colors.textDim, fontSize: FontSize.xs },
});
