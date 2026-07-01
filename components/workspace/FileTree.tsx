import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { FileNode } from '@/services/mockData';

const LANG_ICONS: Record<string, { icon: string; color: string }> = {
  jsx: { icon: 'react', color: '#61DAFB' },
  tsx: { icon: 'react', color: '#61DAFB' },
  js: { icon: 'language-javascript', color: '#F0DB4F' },
  ts: { icon: 'language-typescript', color: '#3178C6' },
  json: { icon: 'code-json', color: '#FFB547' },
  css: { icon: 'language-css3', color: '#264DE4' },
  html: { icon: 'language-html5', color: '#E44D26' },
  md: { icon: 'language-markdown', color: '#7C4DFF' },
  py: { icon: 'language-python', color: '#3776AB' },
  vue: { icon: 'vuejs', color: '#42b883' },
  default: { icon: 'file-outline', color: Colors.textMuted },
};

interface Props {
  nodes: FileNode[];
  activeFile: FileNode | null;
  onSelect: (file: FileNode) => void;
  depth?: number;
}

function FileTreeNode({ node, activeFile, onSelect, depth = 0 }: {
  node: FileNode;
  activeFile: FileNode | null;
  onSelect: (f: FileNode) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const isFolder = node.type === 'folder';
  const isActive = activeFile?.id === node.id;

  const ext = node.name.split('.').pop() || '';
  const iconInfo = LANG_ICONS[ext] || LANG_ICONS.default;

  return (
    <View>
      <Pressable
        onPress={() => {
          if (isFolder) setExpanded(v => !v);
          else onSelect(node);
        }}
        style={({ pressed }) => [
          styles.item,
          { paddingLeft: Spacing.md + depth * 14 },
          isActive && styles.itemActive,
          pressed && styles.itemPressed,
        ]}
      >
        {isFolder ? (
          <MaterialCommunityIcons
            name={expanded ? 'folder-open' : 'folder'}
            size={16}
            color="#FFB547"
          />
        ) : (
          <MaterialCommunityIcons
            name={iconInfo.icon as any}
            size={14}
            color={iconInfo.color}
          />
        )}
        <Text style={[styles.name, isActive && styles.nameActive]} numberOfLines={1}>
          {node.name}
        </Text>
        {node.isNew && <View style={styles.newDot} />}
        {isFolder && (
          <MaterialCommunityIcons
            name={expanded ? 'chevron-down' : 'chevron-right'}
            size={14}
            color={Colors.textDim}
            style={{ marginLeft: 'auto' as any }}
          />
        )}
      </Pressable>

      {isFolder && expanded && node.children?.map(child => (
        <FileTreeNode
          key={child.id}
          node={child}
          activeFile={activeFile}
          onSelect={onSelect}
          depth={depth + 1}
        />
      ))}
    </View>
  );
}

export default function FileTree({ nodes, activeFile, onSelect, depth = 0 }: Props) {
  return (
    <View>
      {nodes.map(node => (
        <FileTreeNode
          key={node.id}
          node={node}
          activeFile={activeFile}
          onSelect={onSelect}
          depth={depth}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs + 1,
    paddingRight: Spacing.md,
  },
  itemActive: { backgroundColor: Colors.primaryDim + '60' },
  itemPressed: { backgroundColor: Colors.surface3 },
  name: { color: Colors.textMuted, fontSize: FontSize.sm, flex: 1 },
  nameActive: { color: Colors.primary },
  newDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
});
