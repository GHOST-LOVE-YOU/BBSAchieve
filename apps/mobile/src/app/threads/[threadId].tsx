import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useThreadRepliesFeed } from "@/features/reading/useThreadRepliesFeed";
import {
  toggleBookmark,
  checkBookmarked,
  createSubscription,
} from "@/features/reading/client";
import type { ReplyItem } from "@/features/reading/types";

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function ThreadPage() {
  const { threadId } = useLocalSearchParams<{ threadId?: string | string[] }>();
  const threadIdValue = Array.isArray(threadId) ? threadId[0] : threadId;
  const theme = useTheme();
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(false);
  const [onlyOP, setOnlyOP] = useState(false);

  const {
    thread,
    board,
    items,
    initialStatus,
    initialError,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useThreadRepliesFeed(threadIdValue);

  useEffect(() => {
    if (threadIdValue) {
      void checkBookmarked(threadIdValue)
        .then((r) => setBookmarked(r.bookmarked))
        .catch(() => {});
    }
  }, [threadIdValue]);

  const handleBookmark = useCallback(async () => {
    if (!threadIdValue) return;
    const res = await toggleBookmark(threadIdValue);
    setBookmarked(res.bookmarked);
  }, [threadIdValue]);

  const handleSubscribe = useCallback(async () => {
    if (!threadIdValue) return;
    await createSubscription({ targetType: "thread", threadId: threadIdValue });
  }, [threadIdValue]);

  const displayItems = onlyOP && thread
    ? items.filter((r) => r.authorName === thread.authorName)
    : items;

  if (initialStatus !== "success") {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: theme.canvas }]}>
        {initialStatus === "loading" ? (
          <ActivityIndicator />
        ) : (
          <Text style={{ color: theme.error }}>
            {initialStatus === "notFound" ? "帖子不存在" : initialError ?? "加载失败"}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.canvas }]}>
      <FlatList
        data={displayItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.three, paddingBottom: Spacing.six }}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          thread ? (
            <View style={styles.header}>
              {/* Mirror banner */}
              <View style={[styles.mirrorBanner, { backgroundColor: theme.surfaceButter }]}>
                <Text style={[styles.mirrorText, { color: theme.tagYellowInk }]}>
                  📡 镜像自 BYR 论坛
                </Text>
              </View>

              {/* Board pill */}
              {board ? (
                <View style={styles.boardRow}>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/boards/[boardId]",
                        params: { boardId: board.slug },
                      })
                    }>
                    <Pill label={board.name} color="blue" />
                  </Pressable>
                </View>
              ) : null}

              {/* Title */}
              <Text style={[styles.title, { color: theme.ink }]}>{thread.title}</Text>

              {/* Author */}
              <View style={styles.authorRow}>
                <Avatar name={thread.authorName} size={32} />
                <View>
                  <Text style={[styles.authorName, { color: theme.ink }]}>
                    {thread.authorName}
                  </Text>
                  <Text style={[styles.authorTime, { color: theme.ash }]}>
                    {formatTime(thread.publishedAt)}
                  </Text>
                </View>
              </View>

              {/* Body */}
              <Text style={[styles.body, { color: theme.inkSecondary }]}>{thread.body}</Text>

              {/* Actions */}
              <View style={styles.actions}>
                <Pressable
                  onPress={() => void handleBookmark()}
                  style={[styles.actionBtn, { backgroundColor: theme.canvasCream }]}>
                  <Text style={{ color: theme.ink }}>{bookmarked ? "⭐ 已收藏" : "☆ 收藏"}</Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleSubscribe()}
                  style={[styles.actionBtn, { backgroundColor: theme.canvasCream }]}>
                  <Text style={{ color: theme.ink }}>🔔 订阅</Text>
                </Pressable>
                <Pressable
                  onPress={() => setOnlyOP((v) => !v)}
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: onlyOP ? theme.primary : theme.canvasCream,
                    },
                  ]}>
                  <Text style={{ color: onlyOP ? theme.onPrimary : theme.ink }}>仅看楼主</Text>
                </Pressable>
              </View>

              {/* Reply count */}
              <Text style={[styles.replyHeader, { color: theme.ink }]}>
                回复 ({thread.replyCount})
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }: { item: ReplyItem }) => (
          <View style={[styles.replyCard, { backgroundColor: theme.surface }]}>
            <View style={styles.replyTop}>
              <Avatar name={item.authorName} size={28} />
              <Text style={[styles.replyAuthor, { color: theme.ink }]}>{item.authorName}</Text>
              <Text style={[styles.replyFloor, { color: theme.ash }]}>#{item.replyIndex}</Text>
              <Text style={[styles.replyTime, { color: theme.ash }]}>
                {formatTime(item.publishedAt)}
              </Text>
            </View>
            <Text style={[styles.replyBody, { color: theme.inkSecondary }]}>{item.body}</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
        onEndReached={() => {
          if (hasMore && !isLoadingMore) void loadMore();
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.center}>
              <ActivityIndicator />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: Spacing.six },
  header: {
    gap: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
  mirrorBanner: {
    borderRadius: Radius.sm,
    padding: Spacing.two,
    alignSelf: "flex-start",
  },
  mirrorText: { fontSize: 13, fontWeight: "600" },
  boardRow: { flexDirection: "row" },
  title: { fontSize: 22, fontWeight: "700", lineHeight: 30 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  authorName: { fontSize: 14, fontWeight: "600" },
  authorTime: { fontSize: 12 },
  body: { fontSize: 15, lineHeight: 24 },
  actions: { flexDirection: "row", gap: Spacing.two, flexWrap: "wrap" },
  actionBtn: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  replyHeader: { fontSize: 17, fontWeight: "700", marginTop: Spacing.two },
  replyCard: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  replyTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  replyAuthor: { fontSize: 14, fontWeight: "600", flex: 1 },
  replyFloor: { fontSize: 12 },
  replyTime: { fontSize: 12 },
  replyBody: { fontSize: 14, lineHeight: 22 },
});
