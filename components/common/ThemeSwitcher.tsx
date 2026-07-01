import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing, THEMES, ThemeName } from '@/constants/theme';

interface Props {
  current: ThemeName;
  onSelect: (name: ThemeName) => void;
  onClose: () => void;
}

export default function ThemeSwitcher({ current, onSelect, onClose }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="palette" size={16} color={Colors.primary} />
        <Text style={styles.title}>ثيم التطبيق</Text>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <MaterialCommunityIcons name="close" size={18} color={Colors.textMuted} />
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}>
        {(Object.keys(THEMES) as ThemeName[]).map(name => {
          const theme = THEMES[name];
          const isActive = current === name;
          return (
            <Pressable
              key={name}
              onPress={() => onSelect(name)}
              style={[styles.themeCard, isActive && styles.themeCardActive, { borderColor: isActive ? theme.primary : Colors.border }]}
            >
              {/* Preview swatches */}
              <View style={[styles.preview, { backgroundColor: theme.bg }]}>
                <View style={[styles.swatch, { backgroundColor: theme.surface }]}>
                  <View style={[styles.swatchPrimary, { backgroundColor: theme.primary }]} />
                  <View style={[styles.swatchAccent, { backgroundColor: theme.accent }]} />
                </View>
              </View>
              <Text style={[styles.themeName, { color: isActive ? theme.primary : Colors.textMuted }]}>
                {theme.themeLabel}
              </Text>
              {isActive && (
                <View style={[styles.checkMark, { backgroundColor: theme.primary }]}>
                  <MaterialCommunityIcons name="check" size={12} color="#fff" />
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', flex: 1 },
  closeBtn: { padding: Spacing.xs },
  list: { padding: Spacing.lg, gap: Spacing.md },
  themeCard: {
    width: 90, alignItems: 'center', gap: Spacing.xs,
    borderRadius: Radius.md, padding: Spacing.sm,
    borderWidth: 2, borderColor: Colors.border, position: 'relative',
  },
  themeCardActive: { },
  preview: { width: 64, height: 44, borderRadius: Radius.sm, padding: 4, overflow: 'hidden' },
  swatch: { flex: 1, borderRadius: Radius.sm - 2, flexDirection: 'row', gap: 2, padding: 4 },
  swatchPrimary: { flex: 1, borderRadius: 2 },
  swatchAccent: { flex: 1, borderRadius: 2 },
  themeName: { fontSize: FontSize.xs, fontWeight: '600', textAlign: 'center' },
  checkMark: {
    position: 'absolute', top: -6, right: -6,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
});
