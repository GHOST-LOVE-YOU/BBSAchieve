import { useKindeAuth } from "@kinde/expo";
import React, { useCallback, useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar";
import { BottomTabInset, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useKindeUser } from "@/features/auth/useKindeUser";
import { useNotificationPreferences } from "@/features/favorites/useNotificationPreferences";
import { fetchSubscriptions, deleteSubscription } from "@/features/reading/client";
import type { SubscriptionItem } from "@/features/reading/types";

const CHANNEL_LABELS: Record<string, { icon: string; name: string }> = {
  telegram: { icon: "📨", name: "Telegram" },
  email: { icon: "📧", name: "Email" },
  browser: { icon: "🔔", name: "App Push" },
};

const EVENT_LABELS: Record<string, string> = {
  replies: "帖子回复",
  mentions: "@提及",
  system: "系统通知",
  digest: "每日摘要",
};

export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const auth = useKindeAuth();
  const user = useKindeUser();
  const userId = user?.id ?? null;
  const prefs = useNotificationPreferences(userId);
  const [subs, setSubs] = useState<SubscriptionItem[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);

  const loadSubs = useCallback(async () => {
    setSubsLoading(true);
    try {
      const res = await fetchSubscriptions();
      setSubs(res.items);
    } catch {
      setSubs([]);
    } finally {
      setSubsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSubs();
  }, [loadSubs]);

  const handleRemoveSub = useCallback(
    async (id: string) => {
      await deleteSubscription(id);
      setSubs((prev) => prev.filter((s) => s.id !== id));
    },
    [],
  );

  const bottomPad = Platform.select({
    ios: insets.bottom + BottomTabInset,
    default: BottomTabInset + Spacing.three,
  });

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.canvas }]}
      contentContainerStyle={{ paddingBottom: bottomPad }}
      contentInsetAdjustmentBehavior="automatic">
      {/* User info */}
      <View style={styles.userSection}>
        <Avatar name={user?.givenName ?? "U"} size={56} color={theme.surfaceSage} />
        <Text style={[styles.greeting, { color: theme.ink }]}>
          {user?.givenName ?? "用户"}，你好
        </Text>
        <Text style={[styles.email, { color: theme.ash }]}>
          {user?.email ?? ""}
        </Text>
      </View>

      {/* Notification channels */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.ink }]}>通知渠道</Text>
        {(["telegram", "email", "browser"] as const).map((ch) => {
          const c = prefs.channels[ch];
          const info = CHANNEL_LABELS[ch];
          return (
            <View key={ch} style={[styles.row, { backgroundColor: theme.surface }]}>
              <Text style={styles.rowIcon}>{info.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: theme.ink }]}>{info.name}</Text>
                <Text style={[styles.rowSub, { color: theme.ash }]}>{c.target}</Text>
              </View>
              <Switch
                value={c.on}
                onValueChange={(on) =>
                  prefs.update({
                    channels: { ...prefs.channels, [ch]: { ...c, on } },
                  })
                }
                trackColor={{ true: theme.primary, false: theme.hairline }}
              />
            </View>
          );
        })}
      </View>

      {/* Event routing */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.ink }]}>事件路由</Text>
        {(["replies", "mentions", "system", "digest"] as const).map((evt) => (
          <View key={evt} style={[styles.row, { backgroundColor: theme.surface }]}>
            <Text style={[styles.rowLabel, { color: theme.ink, flex: 1 }]}>
              {EVENT_LABELS[evt]}
            </Text>
            {(["telegram", "email", "browser"] as const).map((ch) => (
              <Pressable
                key={ch}
                onPress={() =>
                  prefs.update({
                    routing: {
                      ...prefs.routing,
                      [evt]: { ...prefs.routing[evt], [ch]: !prefs.routing[evt][ch] },
                    },
                  })
                }
                style={[
                  styles.routeChip,
                  {
                    backgroundColor: prefs.routing[evt][ch]
                      ? theme.primary
                      : theme.canvasCream,
                  },
                ]}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: prefs.routing[evt][ch] ? theme.onPrimary : theme.ash,
                  }}>
                  {CHANNEL_LABELS[ch].icon}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.ink }]}>通知偏好</Text>
        {(
          [
            ["replies", "收到帖子回复时通知"],
            ["mentions", "被 @提及 时通知"],
            ["system", "系统维护通知"],
            ["digest", "每日摘要"],
            ["weekend", "周末免打扰"],
          ] as [keyof typeof prefs.prefs, string][]
        ).map(([key, label]) => (
          <View key={key} style={[styles.row, { backgroundColor: theme.surface }]}>
            <Text style={[styles.rowLabel, { color: theme.ink, flex: 1 }]}>{label}</Text>
            <Switch
              value={prefs.prefs[key]}
              onValueChange={(v) =>
                prefs.update({ prefs: { ...prefs.prefs, [key]: v } })
              }
              trackColor={{ true: theme.primary, false: theme.hairline }}
            />
          </View>
        ))}
      </View>

      {/* Subscriptions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.ink }]}>订阅管理</Text>
        {subs.length === 0 ? (
          <Text style={[styles.emptyHint, { color: theme.ash }]}>暂无订阅</Text>
        ) : (
          subs.map((s) => (
            <View key={s.id} style={[styles.row, { backgroundColor: theme.surface }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: theme.ink }]} numberOfLines={1}>
                  {s.threadTitle ?? `${s.targetType === "reply" ? "回复" : "帖子"} #${s.replyFloor ?? ""}`}
                </Text>
                <Text style={[styles.rowSub, { color: theme.ash }]}>
                  {s.subscriptionStatus === "active" ? "活跃" : s.subscriptionStatus}
                </Text>
              </View>
              <Pressable onPress={() => void handleRemoveSub(s.id)}>
                <Text style={{ color: theme.error, fontSize: 13, fontWeight: "600" }}>取消</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      {/* Logout */}
      <View style={[styles.section, { alignItems: "center" }]}>
        <Pressable
          onPress={() => void auth.logout()}
          style={[styles.logoutBtn, { backgroundColor: theme.surface }]}>
          <Text style={{ color: theme.error, fontWeight: "600", fontSize: 15 }}>退出登录</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  userSection: {
    alignItems: "center",
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "700",
  },
  email: {
    fontSize: 14,
  },
  section: {
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.four,
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: Spacing.one,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.three,
    borderRadius: Radius.lg,
    gap: Spacing.two,
  },
  rowIcon: {
    fontSize: 20,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  rowSub: {
    fontSize: 12,
    marginTop: 2,
  },
  routeChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyHint: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: Spacing.four,
  },
  logoutBtn: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.pill,
  },
});
