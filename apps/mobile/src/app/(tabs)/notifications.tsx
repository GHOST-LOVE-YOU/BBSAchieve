import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ColorValue,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { MOBILE_TABBAR_SCROLL_GAP } from "@/components/bottom-tab-visuals";
import { EmptyState } from "@/components/empty-state";
import { Spacing } from "@/constants/theme";
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
  const mountedRef = useRef(true);

  const load = useCallback(async (isActive: () => boolean = () => true) => {
    if (!isActive()) return;
    setLoading(true);
    try {
      const res = await fetchNotifications(filter);
      if (!isActive()) return;
      setItems(res.items);
      setUnreadCount(res.unreadCount);
    } catch {
      if (!isActive()) return;
      setItems([]);
    } finally {
      if (!isActive()) return;
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    let active = true;
    mountedRef.current = true;

    const run = async () => {
      await load(() => active);
    };

    void run();

    return () => {
      active = false;
      mountedRef.current = false;
    };
  }, [load]);

  const handleMarkAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    void load(() => mountedRef.current);
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

  const bottomPad = MOBILE_TABBAR_SCROLL_GAP + insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: theme.canvas }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.eyebrow, { color: theme.inkTertiary }]}>通知中心</Text>
          <Text style={[styles.title, { color: theme.ink }]}>
            {unreadCount > 0 ? `${unreadCount} 条未读通知` : "已经全部看完啦"}
          </Text>
          <Text style={[styles.subtitle, { color: theme.inkTertiary }]}>
            通过你绑定的机器人收件箱送达 · 匿名
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          style={styles.filtersWrap}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              android_ripple={{ color: "transparent", borderless: false }}
              onPress={() => setFilter(f.key)}
              style={[
                styles.chip,
                {
                  backgroundColor: filter === f.key ? theme.ink : theme.canvasSoft,
                },
              ]}>
              <Text
                style={[
                  styles.chipText,
                  { color: filter === f.key ? theme.onPrimary : theme.inkSecondary },
                ]}>
                {f.key === "unread" && unreadCount > 0 ? `${f.label} · ${unreadCount}` : f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ paddingBottom: bottomPad }}
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
            android_ripple={{ color: "transparent", borderless: false }}
            onPress={() => void handleTap(item)}
            style={[
              styles.notifRow,
              {
                backgroundColor: theme.surface,
                borderBottomColor: theme.hairlineSoft,
              },
            ]}>
            {!item.readAt ? (
              <View style={[styles.unreadMark, { backgroundColor: theme.primary }]} />
            ) : null}
            <View
              style={[
                styles.notifIcon,
                {
                  backgroundColor:
                    item.type === "system"
                      ? theme.surfaceButter
                      : item.type === "reply_quote"
                        ? theme.surfaceMauve
                        : theme.surfaceSky,
                },
              ]}>
              {item.type === "system" || item.type === "reply_quote" ? (
                <Text style={styles.notifIconText}>
                  {item.type === "system" ? "!" : "@"}
                </Text>
              ) : (
                <ReplyIcon color={theme.ink} />
              )}
            </View>
            <View style={styles.notifContent}>
              <Text style={[styles.notifBody, { color: theme.ink }]} numberOfLines={3}>
                {item.body}
              </Text>
              <Text style={[styles.notifSource, { color: theme.inkTertiary }]} numberOfLines={1}>
                {item.sourceLabel ?? item.threadTitle ?? "通知"}
              </Text>
            </View>
            <Text style={[styles.timeAside, { color: theme.inkTertiary }]} numberOfLines={1}>
              {formatTime(item.occurredAt)}
            </Text>
          </Pressable>
        )}
        ListFooterComponent={
          items.length > 0 ? (
            <View style={styles.footerAction}>
              <Pressable
                android_ripple={{ color: "transparent", borderless: false }}
                onPress={() => void handleMarkAllRead()}
                style={[styles.footerButton, { backgroundColor: theme.canvasSoft }]}>
                <CheckIcon color={theme.inkSecondary} />
                <Text style={[styles.footerButtonText, { color: theme.inkSecondary }]}>
                  全部标为已读
                </Text>
              </Pressable>
            </View>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator />
            </View>
          ) : (
            <EmptyState icon="🔔" title="没有通知" message="新内容会出现在这里" />
          )
        }
      />
    </View>
  );
}

function CheckIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.checkIcon}>
      <View style={[styles.checkShort, { backgroundColor: color }]} />
      <View style={[styles.checkLong, { backgroundColor: color }]} />
    </View>
  );
}

function ReplyIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.replyIcon}>
      <View style={[styles.replyStem, { backgroundColor: color }]} />
      <View style={[styles.replyShaft, { backgroundColor: color }]} />
      <View style={[styles.replyHeadTop, { backgroundColor: color }]} />
      <View style={[styles.replyHeadBottom, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingTop: 12,
    paddingBottom: 6,
    gap: 8,
  },
  headerTop: {
    paddingHorizontal: 16,
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "500",
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 4,
  },
  filters: {
    flexDirection: "row",
    gap: Spacing.two,
    paddingHorizontal: 14,
  },
  filtersWrap: {
    flexGrow: 0,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: "500",
  },
  notifRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    position: "relative",
  },
  unreadMark: {
    position: "absolute",
    left: 6,
    top: 22,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  notifIconText: {
    fontSize: 16,
    fontWeight: "700",
  },
  replyIcon: {
    width: 16,
    height: 16,
    position: "relative",
  },
  replyStem: {
    position: "absolute",
    left: 4,
    top: 4.5,
    width: 2,
    height: 5.5,
    borderRadius: 2,
  },
  replyShaft: {
    position: "absolute",
    left: 4,
    top: 9,
    width: 8,
    height: 2,
    borderRadius: 2,
  },
  replyHeadTop: {
    position: "absolute",
    left: 2.7,
    top: 7.3,
    width: 4.8,
    height: 2,
    borderRadius: 2,
    transform: [{ rotate: "-40deg" }],
  },
  replyHeadBottom: {
    position: "absolute",
    left: 2.7,
    top: 9.7,
    width: 4.8,
    height: 2,
    borderRadius: 2,
    transform: [{ rotate: "40deg" }],
  },
  notifContent: {
    flex: 1,
  },
  notifBody: {
    fontSize: 13.5,
    lineHeight: 20.25,
  },
  notifSource: {
    fontSize: 11.5,
    marginTop: 3,
  },
  timeAside: {
    fontSize: 11,
    paddingLeft: 2,
  },
  footerAction: {
    alignItems: "center",
    padding: 14,
  },
  footerButton: {
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerButtonText: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  checkIcon: {
    width: 13,
    height: 13,
    position: "relative",
  },
  checkShort: {
    position: "absolute",
    left: 2,
    top: 7,
    width: 5,
    height: 2,
    borderRadius: 2,
    transform: [{ rotate: "45deg" }],
  },
  checkLong: {
    position: "absolute",
    left: 5,
    top: 5,
    width: 8,
    height: 2,
    borderRadius: 2,
    transform: [{ rotate: "-50deg" }],
  },
  center: {
    paddingVertical: Spacing.six,
    alignItems: "center",
  },
});
