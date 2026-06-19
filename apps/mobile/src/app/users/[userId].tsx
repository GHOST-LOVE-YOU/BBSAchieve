import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ColorValue,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/empty-state";
import { Avatar } from "@/components/avatar";
import { Pill } from "@/components/pill";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  fetchUserProfile,
  fetchUserThreads,
  fetchUserReplies,
} from "@/features/reading/client";
import type {
  UserProfile,
  UserThreadItem,
  UserReplyItem,
} from "@/features/reading/types";

const DETAIL_BOTTOM_PAD = 28;

function formatShortDate(iso: string) {
  const date = new Date(iso);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function ProfileHeader({
  profile,
}: {
  profile: UserProfile;
}) {
  const theme = useTheme();
  const isBot = profile.userType === "bot";
  const tagline =
    profile.bot?.personaSummary ??
    profile.bio ??
    (isBot
      ? "周期性同步北邮人论坛内容，转成机器人发帖和回复。点开下方条目可单独订阅。"
      : "真实用户身份不可被搜索或认领；这里只展示与通知相关的公开资料。");

  return (
    <View
      style={[
        styles.header,
        { backgroundColor: isBot ? theme.surfaceSky : theme.surfaceMauve },
      ]}>
      <Avatar
        name={profile.displayName}
        size={72}
        color={isBot ? theme.surfaceButter : theme.surfaceSky}
      />
      <Text style={[styles.name, { color: theme.ink }]}>{profile.displayName}</Text>
      <Text style={[styles.handle, { color: theme.inkTertiary }]}>@{profile.username}</Text>
      <Text style={[styles.bio, { color: theme.inkSecondary }]}>{tagline}</Text>
      <View style={styles.pills}>
        {isBot ? <Pill label="镜像" color="blue" /> : <Pill label="真实用户" color="mauve" />}
        {profile.bot?.sourceLabel ? (
          <Pill label={profile.bot.sourceLabel} color="turquoise" />
        ) : null}
        <Pill label={`${profile.threadCount + profile.replyCount} 动态`} color="green" />
      </View>

    </View>
  );
}

function ActivityTabs({
  profile,
  tab,
  setTab,
}: {
  profile: UserProfile;
  tab: number;
  setTab: (n: number) => void;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.segmented, { backgroundColor: theme.canvasCream }]}>
      {[
        { icon: "post" as const, label: "最近发帖", count: profile.threadCount },
        { icon: "reply" as const, label: "最近回复", count: profile.replyCount },
      ].map((item, index) => {
        const active = tab === index;
        return (
          <Pressable
            key={item.label}
            android_ripple={{ color: "transparent", borderless: false }}
            onPress={() => setTab(index)}
            style={[
              styles.segment,
              { backgroundColor: active ? theme.surface : "transparent" },
            ]}>
            <View style={styles.segmentInner}>
              {item.icon === "post" ? (
                <PostMiniIcon color={active ? theme.ink : theme.ash} />
              ) : (
                <ReplyMiniIcon color={active ? theme.ink : theme.ash} />
              )}
              <Text style={[styles.segmentText, { color: active ? theme.ink : theme.ash }]}>
                {item.label} {item.count}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profileState, setProfileState] = useState<{
    loading: boolean;
    profile: UserProfile | null;
    userId: string;
  }>({ loading: true, profile: null, userId });
  const [tab, setTab] = useState(0);
  const [threads, setThreads] = useState<UserThreadItem[]>([]);
  const [replies, setReplies] = useState<UserReplyItem[]>([]);
  const profileRequestVersionRef = useRef(0);
  const activityRequestVersionRef = useRef(0);

  useEffect(() => {
    let active = true;
    profileRequestVersionRef.current += 1;
    const requestVersion = profileRequestVersionRef.current;

    void fetchUserProfile(userId)
      .then((profile) => {
        if (active && profileRequestVersionRef.current === requestVersion) {
          setProfileState({ loading: false, profile, userId });
        }
      })
      .catch(() => {
        if (active && profileRequestVersionRef.current === requestVersion) {
          setProfileState({ loading: false, profile: null, userId });
        }
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const profile = profileState.userId === userId ? profileState.profile : null;
  const loading = profileState.userId !== userId || profileState.loading;
  const activityUserId = profile?.id ?? null;

  useEffect(() => {
    let active = true;
    activityRequestVersionRef.current += 1;
    const requestVersion = activityRequestVersionRef.current;

    if (!activityUserId) {
      return () => {
        active = false;
      };
    }

    if (tab === 0) {
      void fetchUserThreads(activityUserId)
        .then((r) => {
          if (active && activityRequestVersionRef.current === requestVersion) setThreads(r.items);
        })
        .catch(() => {});
    } else {
      void fetchUserReplies(activityUserId)
        .then((r) => {
          if (active && activityRequestVersionRef.current === requestVersion) setReplies(r.items);
        })
        .catch(() => {});
    }

    return () => {
      active = false;
    };
  }, [activityUserId, tab]);

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: theme.canvas }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.root, { backgroundColor: theme.canvas }]}>
        <EmptyState icon="👤" title="用户不存在" />
      </View>
    );
  }

  if (tab === 0) {
    return (
      <View style={[styles.root, { backgroundColor: theme.canvas }]}>
        <Stack.Screen options={{ title: profile.userType === "bot" ? "机器人主页" : "用户" }} />
        <FlatList
          data={threads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: DETAIL_BOTTOM_PAD + insets.bottom }}
          contentInsetAdjustmentBehavior="automatic"
          ListHeaderComponent={
            <>
              <ProfileHeader profile={profile} />
              <ActivityTabs profile={profile} tab={tab} setTab={setTab} />
            </>
          }
          renderItem={({ item }) => (
            <Pressable
              android_ripple={{ color: "transparent", borderless: false }}
              onPress={() =>
                router.push({
                  pathname: "/threads/[threadId]",
                  params: { threadId: item.id },
                })
              }
              style={[
                styles.activityRow,
                { backgroundColor: theme.surface, borderBottomColor: theme.hairlineSoft },
              ]}>
              <View style={styles.rowHeader}>
                <Pill label="发帖" color="mauve" />
                <Text style={[styles.rowMeta, { color: theme.inkTertiary }]}>{item.boardName}</Text>
              </View>
              <Text style={[styles.rowTitle, { color: theme.ink }]} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={[styles.rowBody, { color: theme.inkSecondary }]} numberOfLines={2}>
                {item.excerpt}
              </Text>
              <View style={styles.rowFooter}>
                <Text style={[styles.rowMeta, { color: theme.inkTertiary }]}>
                  {formatShortDate(item.publishedAt)} · {item.replyCount} 回复
                </Text>
                <View style={[styles.subscribePill, { backgroundColor: theme.canvasSoft }]}>
                  <BellMiniIcon color={theme.inkSecondary} />
                  <Text style={[styles.subscribeText, { color: theme.inkSecondary }]}>订阅</Text>
                </View>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<EmptyState icon="📝" title="暂无帖子" />}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.canvas }]}>
      <Stack.Screen options={{ title: profile.userType === "bot" ? "机器人主页" : "用户" }} />
      <FlatList
        data={replies}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: DETAIL_BOTTOM_PAD + insets.bottom }}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          <>
            <ProfileHeader profile={profile} />
            <ActivityTabs profile={profile} tab={tab} setTab={setTab} />
          </>
        }
        renderItem={({ item }) => (
          <Pressable
            android_ripple={{ color: "transparent", borderless: false }}
            onPress={() =>
              router.push({
                pathname: "/threads/[threadId]",
                params: { threadId: item.threadId },
              })
            }
            style={[
              styles.activityRow,
              { backgroundColor: theme.surface, borderBottomColor: theme.hairlineSoft },
            ]}>
            <View style={styles.rowHeader}>
              <Pill label="回复" color="blue" />
              <Text style={[styles.rowMeta, { color: theme.inkTertiary }]}>
                #{item.floor} · {formatShortDate(item.publishedAt)}
              </Text>
            </View>
            <Text style={[styles.rowTitle, { color: theme.ink }]} numberOfLines={2}>
              {item.body}
            </Text>
            <Text style={[styles.rowMeta, { color: theme.inkTertiary }]} numberOfLines={1}>
              《{item.threadSourceTrimmedTitle || item.threadTitle}》
            </Text>
            <View style={styles.rowFooter}>
              <View />
              <View style={[styles.subscribePill, { backgroundColor: theme.canvasSoft }]}>
                <BellMiniIcon color={theme.inkSecondary} />
                <Text style={[styles.subscribeText, { color: theme.inkSecondary }]}>订阅楼</Text>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<EmptyState icon="📝" title="暂无回复" />}
      />
    </View>
  );
}

function PostMiniIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.postMiniIcon}>
      <View style={[styles.postMiniSheet, { borderColor: color }]} />
      <View style={[styles.postMiniLine1, { backgroundColor: color }]} />
      <View style={[styles.postMiniLine2, { backgroundColor: color }]} />
      <View style={[styles.postMiniLine3, { backgroundColor: color }]} />
    </View>
  );
}

function ReplyMiniIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.replyMiniIcon}>
      <View style={[styles.replyMiniBubble, { borderColor: color }]} />
      <View style={[styles.replyMiniTail, { backgroundColor: color }]} />
    </View>
  );
}

function BellMiniIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.bellMiniIcon}>
      <View style={[styles.bellMiniDome, { borderColor: color }]} />
      <View style={[styles.bellMiniBase, { backgroundColor: color }]} />
      <View style={[styles.bellMiniDot, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  header: {
    alignItems: "center",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: Spacing.two,
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 14,
  },
  name: { fontSize: 20, fontWeight: "500", letterSpacing: 0, marginTop: 4, marginBottom: 2 },
  handle: { fontSize: 13 },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  bio: {
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 19.5,
    marginTop: 6,
  },
  segmented: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 14,
    marginBottom: 12,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    borderRadius: 9,
    paddingVertical: Spacing.two,
  },
  segmentInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  segmentText: { fontSize: 13, fontWeight: "500" },
  activityRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowTitle: { fontSize: 15, fontWeight: "500", lineHeight: 21 },
  rowBody: { fontSize: 13, lineHeight: 19.5 },
  rowMeta: { fontSize: 11.5 },
  rowFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  subscribePill: {
    borderRadius: 50,
    paddingHorizontal: 9,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  subscribeText: { fontSize: 11.5, fontWeight: "600" },
  postMiniIcon: {
    width: 12,
    height: 12,
    position: "relative",
  },
  postMiniSheet: {
    position: "absolute",
    left: 1.5,
    top: 1,
    width: 9,
    height: 9,
    borderWidth: 1.5,
    borderRadius: 2,
  },
  postMiniLine1: {
    position: "absolute",
    left: 3,
    top: 4,
    width: 5.8,
    height: 1,
    borderRadius: 2,
  },
  postMiniLine2: {
    position: "absolute",
    left: 3,
    top: 6.2,
    width: 5.8,
    height: 1,
    borderRadius: 2,
  },
  postMiniLine3: {
    position: "absolute",
    left: 3,
    top: 8.4,
    width: 4.2,
    height: 1,
    borderRadius: 2,
  },
  replyMiniIcon: {
    width: 12,
    height: 12,
    position: "relative",
  },
  replyMiniBubble: {
    position: "absolute",
    left: 1.2,
    top: 1.5,
    width: 8.5,
    height: 6.5,
    borderWidth: 1.5,
    borderRadius: 6,
  },
  replyMiniTail: {
    position: "absolute",
    left: 4.2,
    bottom: 1.3,
    width: 3.2,
    height: 1.5,
    borderRadius: 2,
    transform: [{ rotate: "-35deg" }],
  },
  bellMiniIcon: {
    width: 12,
    height: 12,
    position: "relative",
  },
  bellMiniDome: {
    position: "absolute",
    left: 2,
    top: 1.5,
    width: 8,
    height: 8,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  bellMiniBase: {
    position: "absolute",
    left: 1,
    right: 1,
    bottom: 2,
    height: 1.5,
    borderRadius: 2,
  },
  bellMiniDot: {
    position: "absolute",
    left: 4.8,
    bottom: 0,
    width: 2.4,
    height: 2.4,
    borderRadius: 2,
  },
});
