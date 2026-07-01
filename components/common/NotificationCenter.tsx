import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { AppNotification } from '@/services/mockData';

interface Props {
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  success: { icon: 'check-circle', color: Colors.success },
  error: { icon: 'close-circle', color: Colors.error },
  warning: { icon: 'alert', color: Colors.warning },
  info: { icon: 'information', color: Colors.primary },
};

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `${mins} دقيقة`;
  return `${Math.floor(mins / 60)} ساعة`;
}

export default function NotificationCenter({ notifications, onMarkRead, onClear, onClose }: Props) {
  const unread = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="bell" size={16} color={Colors.primary} />
        <Text style={styles.title}>الإشعارات</Text>
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread}</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        {notifications.length > 0 && (
          <Pressable onPress={onClear} style={styles.clearBtn}>
            <Text style={styles.clearText}>مسح الكل</Text>
          </Pressable>
        )}
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <MaterialCommunityIcons name="close" size={18} color={Colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 && (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="bell-off-outline" size={36} color={Colors.textDim} />
            <Text style={styles.emptyText}>لا توجد إشعارات</Text>
          </View>
        )}
        {notifications.map(n => {
          const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
          return (
            <Pressable
              key={n.id}
              onPress={() => onMarkRead(n.id)}
              style={[styles.item, !n.read && styles.itemUnread]}
            >
              <View style={[styles.iconWrap, { backgroundColor: cfg.color + '20' }]}>
                <MaterialCommunityIcons name={cfg.icon as any} size={18} color={cfg.color} />
              </View>
              <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{n.title}</Text>
                  <Text style={styles.itemTime}>{timeAgo(n.timestamp)}</Text>
                </View>
                <Text style={styles.itemMsg}>{n.message}</Text>
                {n.screen && (
                  <View style={styles.screenTag}>
                    <Text style={styles.screenTagText}>{n.screen}</Text>
                  </View>
                )}
              </View>
              {!n.read && <View style={styles.unreadDot} />}
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
    maxHeight: 320, zIndex: 100,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.md, paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  badge: { backgroundColor: Colors.error, borderRadius: Radius.full, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  clearBtn: { backgroundColor: Colors.surface2, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  clearText: { color: Colors.textDim, fontSize: FontSize.xs },
  closeBtn: { padding: Spacing.xs },
  list: { flex: 1 },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyText: { color: Colors.textDim, fontSize: FontSize.md },
  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md,
    padding: Spacing.md, paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1, borderBottomColor: Colors.border + '40',
  },
  itemUnread: { backgroundColor: Colors.surface2 },
  iconWrap: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  itemContent: { flex: 1 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemTitle: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '700' },
  itemTime: { color: Colors.textDim, fontSize: FontSize.xs },
  itemMsg: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  screenTag: { marginTop: 4, backgroundColor: Colors.surface3, borderRadius: Radius.sm, paddingHorizontal: Spacing.xs, alignSelf: 'flex-start' },
  screenTagText: { color: Colors.textDim, fontSize: 10 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 6 },
});
