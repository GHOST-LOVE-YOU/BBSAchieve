import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Avatar } from "@/components/avatar";
import { Pill } from "@/components/pill";
import { PostCard } from "@/components/post-card";
import { SegmentedControl } from "@/components/segmented-control";
import { EmptyState } from "@/components/empty-state";
import { Radius, Spacing } from "@/constants/theme";
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

function ProfileHeader({
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
    <View style={styles.header}>
      <Avatar
        name={profile.displayName}
        size={64}
        color={profile.userType === "bot" ? theme.surfaceButter : theme.surfaceSky}
      />
      <Text style={[styles.name, { color: theme.ink }]}>{profile.displayName}</Text>
      <Text style={[styles.handle, { color: theme.ash }]}>@{profile.username}</Text>

      <View style={styles.pills}>
        {profile.userType === "bot" ? <Pill label="机器人" color="yellow" /> : null}
        {profile.bot?.sourceLabel ? (
          <Pill label={profile.bot.sourceLabel} color="turquoise" />
        ) : null}
      </View>

      {profile.bio ? (
        <Text style={[styles.bio, { color: theme.inkSecondary }]}>{profile.bio}</Text>
      ) : null}
      {profile.bot?.personaSummary ? (
        <Text style={[styles.bio, { color: theme.inkSecondary }]}>
          {profile.bot.personaSummary}
        </Text>
      ) : null}

      <View style={styles.stats}>
        <Text style={[styles.stat, { color: theme.ink }]}>
          {profile.threadCount} <Text style={{ color: theme.ash }}>帖子</Text>
        </Text>
        <Text style={[styles.stat, { color: theme.ink }]}>
          {profile.replyCount} <Text style={{ color: theme.ash }}>回复</Text>
        </Text>
      </View>

      <SegmentedControl items={["最近发帖", "最近回复"]} selected={tab} onChange={setTab} />
    </View>
  );
}

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const theme = useTheme();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [threads, setThreads] = useState<UserThreadItem[]>([]);
  const [replies, setReplies] = useState<UserReplyItem[]>([]);

  useEffect(() => {
    setLoading(true);
    void fetchUserProfile(userId)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (tab === 0) {
      void fetchUserThreads(userId)
        .then((r) => setThreads(r.items))
        .catch(() => {});
    } else {
      void fetchUserReplies(userId)
        .then((r) => setReplies(r.items))
        .catch(() => {});
    }
  }, [userId, tab]);

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
        <FlatList
          data={threads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: Spacing.three }}
          contentInsetAdjustmentBehavior="automatic"
          ListHeaderComponent={<ProfileHeader profile={profile} tab={tab} setTab={setTab} />}
          renderItem={({ item }) => (
            <PostCard
              threadId={item.id}
              title={item.title}
              excerpt={item.excerpt}
              authorName={profile.displayName}
              boardName={item.boardName}
              boardSlug={item.boardSlug}
              replyCount={item.replyCount}
              isBot={profile.userType === "bot"}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
          ListEmptyComponent={<EmptyState icon="📝" title="暂无帖子" />}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.canvas }]}>
      <FlatList
        data={replies}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.three }}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={<ProfileHeader profile={profile} tab={tab} setTab={setTab} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/threads/[threadId]",
                params: { threadId: item.threadId },
              })
            }
            style={[styles.replyCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.replyThread, { color: theme.ash }]} numberOfLines={1}>
              {item.threadTitle}
            </Text>
            <Text style={[styles.replyBody, { color: theme.inkSecondary }]} numberOfLines={3}>
              {item.body}
            </Text>
            <Text style={[styles.replyFloor, { color: theme.ash }]}>#{item.floor}</Text>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
        ListEmptyComponent={<EmptyState icon="📝" title="暂无回复" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  header: {
    alignItems: "center",
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  name: { fontSize: 22, fontWeight: "700" },
  handle: { fontSize: 14 },
  pills: { flexDirection: "row", gap: Spacing.two },
  bio: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: Spacing.three,
  },
  stats: { flexDirection: "row", gap: Spacing.five, paddingVertical: Spacing.two },
  stat: { fontSize: 16, fontWeight: "600" },
  replyCard: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: 4,
  },
  replyThread: { fontSize: 12 },
  replyBody: { fontSize: 14, lineHeight: 20 },
  replyFloor: { fontSize: 12 },
});
