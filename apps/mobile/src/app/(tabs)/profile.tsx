import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ColorValue,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar";
import { MOBILE_TABBAR_SCROLL_GAP } from "@/components/bottom-tab-visuals";
import { useTheme } from "@/hooks/use-theme";
import { useKindeUser } from "@/features/auth/useKindeUser";
import { useMobileAuth } from "@/features/auth/useMobileAuth";
import { useNotificationPreferences } from "@/features/favorites/useNotificationPreferences";
import { fetchSubscriptions, deleteSubscription } from "@/features/reading/client";
import type { SubscriptionItem } from "@/features/reading/types";

const CHANNEL_LABELS: Record<string, { name: string; desc: string }> = {
  telegram: { name: "Telegram", desc: "通过 @ByrAchieveBot 推送" },
  email: { name: "邮箱", desc: "5 分钟聚合，避免打扰" },
  browser: { name: "App 通知", desc: "通过系统通知中心推送" },
};

const CHANNEL_COLORS: Record<string, string> = {
  telegram: "#229ED9",
  email: "#D97757",
  browser: "#547358",
};

const EVENT_LABELS: Record<string, string> = {
  replies: "新回复",
  mentions: "@ 提及",
  system: "系统消息",
  digest: "每日早间汇总",
};

const PREFERENCE_ITEMS = [
  { key: "replies", label: "新回复通知", sub: "你订阅的帖子有新回复时" },
  { key: "mentions", label: "@ 提及与认领", sub: "有人引用了你认领的回复" },
  { key: "system", label: "系统消息", sub: "镜像源失效、机器人切换等" },
  { key: "digest", label: "每日早间汇总", sub: "每天 9:00 推送" },
  { key: "weekend", label: "周末免打扰", sub: "仅推送高优先通知" },
] as const;

export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const auth = useMobileAuth();
  const user = useKindeUser();
  const systemScheme = useColorScheme();
  const userId = user?.id ?? null;
  const prefs = useNotificationPreferences(userId);
  const [subs, setSubs] = useState<SubscriptionItem[]>([]);
  const mountedRef = useRef(true);
  const subsRequestVersionRef = useRef(0);
  const enabledChannelCount = Object.values(prefs.channels).filter((c) => c.on).length;

  const loadSubs = useCallback(async (isActive: () => boolean = () => true) => {
    try {
      const res = await fetchSubscriptions();
      if (!isActive()) return;
      setSubs(res.items);
    } catch {
      if (!isActive()) return;
      setSubs([]);
    }
  }, []);

  useEffect(() => {
    let active = true;
    mountedRef.current = true;
    subsRequestVersionRef.current += 1;
    const requestVersion = subsRequestVersionRef.current;

    void loadSubs(() => active && subsRequestVersionRef.current === requestVersion);

    return () => {
      active = false;
      mountedRef.current = false;
    };
  }, [loadSubs]);

  const handleRemoveSub = useCallback(
    async (id: string) => {
      await deleteSubscription(id);
      if (!mountedRef.current) return;
      setSubs((prev) => prev.filter((s) => s.id !== id));
    },
    [],
  );

  const formatSubscriptionMeta = useCallback((item: SubscriptionItem) => {
    const scope =
      item.targetType === "reply" && item.replyFloor != null
        ? `${item.replyFloor} 楼回复`
        : "全帖";
    const updatedAt = item.lastReplyAt ?? item.createdAt;
    return `${scope} · 最近更新 ${formatRelativeTime(updatedAt)}`;
  }, []);

  const bottomPad = MOBILE_TABBAR_SCROLL_GAP + insets.bottom;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: theme.canvas }]}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: bottomPad }}
      contentInsetAdjustmentBehavior="automatic">
      <View style={[styles.hero, { backgroundColor: theme.surfaceSky }]}>
        <Avatar name={user?.givenName ?? "U"} size={56} color={theme.surfaceSage} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.eyebrow, { color: theme.inkTertiary }]}>个人中心</Text>
          <Text style={[styles.greeting, { color: theme.ink }]}>
            你好，{user?.givenName ?? "用户"}
          </Text>
          <Text style={[styles.email, { color: theme.ash }]}>
            {enabledChannelCount} / 3 通道启用 · {subs.length} 项订阅
          </Text>
        </View>
      </View>

      {/* Notification channels */}
      <View style={styles.section}>
        <SectionTitle eyebrow="通知通道" title="在哪里收到新动态？" />
        {(["telegram", "email", "browser"] as const).map((ch) => {
          const c = prefs.channels[ch];
          const info = CHANNEL_LABELS[ch];
          const isPrimary = ch === "telegram" && c.on;
          const showTarget = c.target !== "未连接" && c.target !== "未授权";
          return (
            <Pressable
              key={ch}
              android_ripple={{ color: "transparent", borderless: false }}
              onPress={() =>
                prefs.update({
                  channels: { ...prefs.channels, [ch]: { ...c, on: !c.on } },
                })
              }
              style={[
                styles.channelRow,
                {
                  backgroundColor: c.on ? theme.surface : theme.canvasSoft,
                  borderColor: isPrimary ? theme.primary : theme.hairline,
                },
                isPrimary && {
                  shadowColor: theme.primary,
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 1,
                },
              ]}>
                <View style={[styles.channelIcon, { backgroundColor: CHANNEL_COLORS[ch] }]}>
                  <ChannelGlyph channel={ch} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.channelNameLine}>
                  <Text style={[styles.channelName, { color: theme.ink }]}>{info.name}</Text>
                </View>
                {showTarget ? (
                  <Text style={[styles.channelTarget, { color: theme.ash }]}>{c.target}</Text>
                ) : null}
                <Text style={[styles.channelDesc, { color: theme.inkTertiary }]}>{info.desc}</Text>
              </View>
              <ChevronIcon color={theme.inkTertiary} />
            </Pressable>
          );
        })}
      </View>

      {/* Event routing */}
      <View style={styles.section}>
        <SectionTitle eyebrow="事件路由" title="每类事件发到哪里？" />
        <View style={[styles.cardGroup, { backgroundColor: theme.surface, borderColor: theme.hairline }]}>
          {(["replies", "mentions", "system", "digest"] as const).map((evt, index) => (
            <View
              key={evt}
              style={[
                styles.cardRow,
                index !== 3 && { borderBottomColor: theme.hairlineSoft },
              ]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.rowLabel, { color: theme.ink }]}>{EVENT_LABELS[evt]}</Text>
                <Text style={[styles.rowSub, { color: theme.inkTertiary }]} numberOfLines={1}>
                  {(["telegram", "email", "browser"] as const)
                    .filter((ch) => prefs.routing[evt][ch] && prefs.channels[ch].on)
                    .map((ch) => CHANNEL_LABELS[ch].name)
                    .join(" · ") || "仅在通知中心"}
                </Text>
              </View>
              <Text style={[styles.routeStat, { color: theme.ash }]}>
                {(["telegram", "email", "browser"] as const).filter((ch) => prefs.routing[evt][ch] && prefs.channels[ch].on).length}/3
              </Text>
              <ChevronIcon color={theme.inkTertiary} small />
            </View>
          ))}
        </View>
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <SectionTitle eyebrow="通知偏好" title="接收哪些事件？" />
        <View style={[styles.cardGroup, { backgroundColor: theme.surface, borderColor: theme.hairline }]}>
          {PREFERENCE_ITEMS.map((item, index) => (
            <View
              key={item.key}
              style={[
                styles.preferenceRow,
                index !== 4 && { borderBottomColor: theme.hairlineSoft },
              ]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.rowLabel, { color: theme.ink }]}>{item.label}</Text>
                <Text style={[styles.rowSub, { color: theme.inkTertiary }]} numberOfLines={1}>
                  {item.sub}
                </Text>
              </View>
              <Switch
                value={prefs.prefs[item.key]}
                onValueChange={(v) =>
                  prefs.update({ prefs: { ...prefs.prefs, [item.key]: v } })
                }
                trackColor={{ true: theme.primary, false: theme.hairline }}
                style={styles.compactSwitch}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Subscriptions */}
      <View style={styles.section}>
        <SectionTitle eyebrow="订阅管理" title="已订阅的帖子与楼层" />
        <View style={[styles.cardGroup, { backgroundColor: theme.surface, borderColor: theme.hairline }]}>
          {subs.length === 0 ? (
            <View style={styles.subscriptionEmpty}>
              <BellOutlineIcon color={theme.inkTertiary} />
              <Text style={[styles.subscriptionEmptyTitle, { color: theme.ink }]}>暂无订阅</Text>
              <Text style={[styles.subscriptionEmptySub, { color: theme.inkTertiary }]}>
                在帖子详情页订阅具体帖子或楼层
              </Text>
            </View>
          ) : (
            subs.map((s, index) => (
              <View
                key={s.id}
                style={[
                  styles.cardRow,
                  index !== subs.length - 1 && { borderBottomColor: theme.hairlineSoft },
                ]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.rowLabel, { color: theme.ink }]} numberOfLines={1}>
                    {s.threadTitle ?? `${s.targetType === "reply" ? "回复" : "帖子"} #${s.replyFloor ?? ""}`}
                  </Text>
                  <Text style={[styles.rowSub, { color: theme.ash }]} numberOfLines={1}>
                    {formatSubscriptionMeta(s)}
                  </Text>
                </View>
                <Pressable
                  android_ripple={{ color: "transparent", borderless: true }}
                  onPress={() => void handleRemoveSub(s.id)}>
                  <Text style={{ color: theme.error, fontSize: 13, fontWeight: "600" }}>取消</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Appearance */}
      <View style={styles.section}>
        <SectionTitle eyebrow="外观" title="主题" />
        <View style={[styles.cardGroup, { backgroundColor: theme.surface, borderColor: theme.hairline }]}>
          <View style={styles.cardRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.rowLabel, { color: theme.ink }]}>深色模式</Text>
              <Text style={[styles.rowSub, { color: theme.inkTertiary }]} numberOfLines={1}>
                当前：{systemScheme === "dark" ? "深色" : "浅色"} · 跟随系统
              </Text>
            </View>
            <Text style={[styles.routeStat, { color: theme.ash }]}>系统</Text>
          </View>
        </View>
      </View>

      {/* Logout */}
      <View style={[styles.section, { alignItems: "center" }]}>
        <Pressable
          android_ripple={{ color: "transparent", borderless: false }}
          onPress={() => void auth.logout()}
          style={[styles.logoutBtn, { backgroundColor: theme.surface }]}>
          <Text style={{ color: theme.error, fontWeight: "600", fontSize: 15 }}>退出登录</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function ChevronIcon({ color, small = false }: { color: ColorValue; small?: boolean }) {
  return (
    <View style={small ? styles.chevIconSmall : styles.chevIcon}>
      <View style={[small ? styles.chevSmallTop : styles.chevTop, { backgroundColor: color }]} />
      <View style={[small ? styles.chevSmallBottom : styles.chevBottom, { backgroundColor: color }]} />
    </View>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeading}>
      <Text style={[styles.sectionEyebrow, { color: theme.inkTertiary }]}>{eyebrow}</Text>
      <Text style={[styles.sectionHeadingTitle, { color: theme.ink }]}>{title}</Text>
    </View>
  );
}

function ChannelGlyph({ channel }: { channel: "telegram" | "email" | "browser" }) {
  if (channel === "email") {
    return (
      <View style={styles.mailIcon}>
        <View style={styles.mailBody} />
        <View style={styles.mailLeftFold} />
        <View style={styles.mailRightFold} />
      </View>
    );
  }

  if (channel === "browser") {
    return (
      <View style={styles.phoneIcon}>
        <View style={styles.phoneBody} />
        <View style={styles.phoneHome} />
      </View>
    );
  }

  return (
    <View style={styles.planeIcon}>
      <View style={styles.planeWing} />
      <View style={styles.planeTail} />
    </View>
  );
}

function BellOutlineIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.emptyBellIcon}>
      <View style={[styles.emptyBellDome, { borderColor: color }]} />
      <View style={[styles.emptyBellBase, { backgroundColor: color }]} />
      <View style={[styles.emptyBellDot, { backgroundColor: color }]} />
    </View>
  );
}

function formatRelativeTime(value: string | null | undefined) {
  if (!value) return "刚刚";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "刚刚";
  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (diffMinutes < 1) return "刚刚";
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} 天前`;
  return new Date(value).toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 18,
    gap: 14,
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0,
  },
  greeting: {
    fontSize: 19,
    fontWeight: "500",
    letterSpacing: 0,
    marginTop: 2,
  },
  email: { fontSize: 12.5 },
  section: {
    paddingHorizontal: 14,
    marginBottom: 18,
    gap: 10,
  },
  sectionHeading: {
    gap: 4,
  },
  sectionEyebrow: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0,
  },
  sectionHeadingTitle: {
    fontSize: 18,
    fontWeight: "500",
    letterSpacing: 0,
  },
  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  channelIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  cardGroup: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  compactSwitch: {
    marginVertical: -8,
    transform: [{ scale: 0.82 }],
  },
  mailIcon: {
    width: 22,
    height: 16,
    position: "relative",
  },
  mailBody: {
    position: "absolute",
    inset: 0,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 2,
  },
  mailLeftFold: {
    position: "absolute",
    left: 3,
    top: 5,
    width: 11,
    height: 2,
    backgroundColor: "#fff",
    transform: [{ rotate: "31deg" }],
  },
  mailRightFold: {
    position: "absolute",
    right: 3,
    top: 5,
    width: 11,
    height: 2,
    backgroundColor: "#fff",
    transform: [{ rotate: "-31deg" }],
  },
  phoneIcon: {
    width: 16,
    height: 22,
    position: "relative",
  },
  phoneBody: {
    position: "absolute",
    inset: 0,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 4,
  },
  phoneHome: {
    position: "absolute",
    bottom: 3,
    left: 6,
    width: 4,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#fff",
  },
  planeIcon: {
    width: 22,
    height: 18,
    position: "relative",
    transform: [{ rotate: "-18deg" }],
  },
  planeWing: {
    position: "absolute",
    top: 7,
    left: 1,
    width: 20,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#fff",
  },
  planeTail: {
    position: "absolute",
    top: 4,
    right: 2,
    width: 10,
    height: 10,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: "#fff",
    transform: [{ rotate: "45deg" }],
  },
  channelName: {
    fontSize: 14.5,
    fontWeight: "600",
  },
  channelNameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  rowSub: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  },
  channelTarget: {
    fontSize: 11.5,
    marginTop: 4,
    fontFamily: "monospace",
  },
  channelDesc: {
    fontSize: 13.6,
    lineHeight: 20.4,
    marginTop: 4,
  },
  chevIcon: {
    width: 16,
    height: 16,
    position: "relative",
  },
  chevTop: {
    position: "absolute",
    right: 4,
    top: 3,
    width: 2,
    height: 7,
    borderRadius: 2,
    transform: [{ rotate: "-38deg" }],
  },
  chevBottom: {
    position: "absolute",
    right: 4,
    bottom: 3,
    width: 2,
    height: 7,
    borderRadius: 2,
    transform: [{ rotate: "38deg" }],
  },
  chevIconSmall: {
    width: 14,
    height: 14,
    marginLeft: -6,
    position: "relative",
  },
  chevSmallTop: {
    position: "absolute",
    right: 3,
    top: 3,
    width: 1.7,
    height: 6,
    borderRadius: 2,
    transform: [{ rotate: "-38deg" }],
  },
  chevSmallBottom: {
    position: "absolute",
    right: 3,
    bottom: 3,
    width: 1.7,
    height: 6,
    borderRadius: 2,
    transform: [{ rotate: "38deg" }],
  },
  routeStat: { fontSize: 12.5 },
  subscriptionEmpty: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  subscriptionEmptyTitle: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 6,
  },
  subscriptionEmptySub: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    textAlign: "center",
  },
  emptyBellIcon: {
    width: 30,
    height: 30,
    opacity: 0.55,
    position: "relative",
  },
  emptyBellDome: {
    position: "absolute",
    left: 7,
    top: 5,
    width: 16,
    height: 16,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  emptyBellBase: {
    position: "absolute",
    left: 5,
    right: 5,
    bottom: 7,
    height: 2,
    borderRadius: 2,
  },
  emptyBellDot: {
    position: "absolute",
    left: 13,
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 4,
  },
  logoutBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
});
