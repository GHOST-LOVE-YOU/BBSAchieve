import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { EmptyState } from "@/components/empty-state";
import { BottomTabInset, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/features/reading/client";
import type { NotificationItem } from "@/features/reading/types";

type FilterKey = "all" | "unread" | "thread_reply" | "reply_quote" | "system";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "unread", label: "未读" },
  { key: "thread_reply", label: "回复" },
  { key: "reply_quote", label: "@提及" },
  { key: "system", label: "系统" },
];

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 3600_000) return `${Math.max(1, Math.floor(diff / 60_000))}分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}小时前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function NotificationsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchNotifications(filter);
      setItems(res.items);
      setUnreadCount(res.unreadCount);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMarkAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    void load();
  }, [load]);

  const handleTap = useCallback(
    async (item: NotificationItem) => {
      if (!item.readAt) {
        void markNotificationRead(item.id);
      }
      if (item.threadId) {
        router.push({ pathname: "/threads/[threadId]", params: { threadId: item.threadId } });
      }
    },
    [router],
  );

  const bottomPad = Platform.select({
    ios: insets.bottom + BottomTabInset,
    default: BottomTabInset + Spacing.three,
  });

  return (
    <View style={[styles.root, { backgroundColor: theme.canvas }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.ink }]}>
            通知{unreadCount > 0 ? ` (${unreadCount})` : ""}
          </Text>
          {unreadCount > 0 ? (
            <Pressable onPress={() => void handleMarkAllRead()}>
              <Text style={[styles.markAll, { color: theme.primary }]}>全部已读</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                styles.chip,
                {
                  backgroundColor: filter === f.key ? theme.primary : theme.canvasCream,
                },
              ]}>
              <Text
                style={[
                  styles.chipText,
                  { color: filter === f.key ? theme.onPrimary : theme.ink },
                ]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.three, paddingBottom: bottomPad }}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={loading && items.length > 0}
            onRefresh={() => void load()}
            tintColor={theme.primary}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => void handleTap(item)}
            style={[
              styles.notifRow,
              {
                backgroundColor: item.readAt ? theme.surface : theme.surfaceSky,
              },
            ]}>
            <View style={styles.notifContent}>
              {item.threadTitle ? (
                <Text style={[styles.notifTitle, { color: theme.ink }]} numberOfLines={1}>
                  {item.threadTitle}
                </Text>
              ) : null}
              <Text style={[styles.notifBody, { color: theme.inkSecondary }]} numberOfLines={2}>
                {item.body}
              </Text>
              <View style={styles.notifMeta}>
                {item.sourceLabel ? (
                  <Text style={[styles.notifSource, { color: theme.ash }]}>
                    {item.sourceLabel}
                  </Text>
                ) : null}
                <Text style={[styles.notifTime, { color: theme.ash }]}>
                  {formatTime(item.occurredAt)}
                </Text>
              </View>
            </View>
            {!item.readAt ? (
              <View style={[styles.dot, { backgroundColor: theme.primary }]} />
            ) : null}
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator />
            </View>
          ) : (
            <EmptyState icon="🔔" title="暂无通知" message="订阅帖子后会在这里收到提醒" />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  markAll: {
    fontSize: 14,
    fontWeight: "600",
  },
  filters: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.pill,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  notifRow: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
  },
  notifContent: {
    flex: 1,
    gap: 4,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  notifBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  notifMeta: {
    flexDirection: "row",
    gap: Spacing.two,
    marginTop: 2,
  },
  notifSource: {
    fontSize: 12,
  },
  notifTime: {
    fontSize: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  center: {
    paddingVertical: Spacing.six,
    alignItems: "center",
  },
});
