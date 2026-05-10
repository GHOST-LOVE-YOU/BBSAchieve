import { useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PostCard } from "@/components/post-card";
import { EmptyState } from "@/components/empty-state";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useKindeUser } from "@/features/auth/useKindeUser";
import { useBoardThreadsFeed } from "@/features/reading/useBoardThreadsFeed";
import { useBoardFavorites } from "@/features/favorites/useBoardFavorites";
import { findBoardBySlug } from "@/features/favorites/boardTree";

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 3600_000) return `${Math.max(1, Math.floor(diff / 60_000))}分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}小时前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function BoardPage() {
  const { boardId } = useLocalSearchParams<{ boardId?: string | string[] }>();
  const boardIdValue = Array.isArray(boardId) ? boardId[0] : boardId;
  const theme = useTheme();
  const user = useKindeUser();
  const userId = user?.id ?? null;
  const { toggle, isFavorite } = useBoardFavorites(userId);
  const treeInfo = boardIdValue ? findBoardBySlug(boardIdValue) : null;

  const {
    board,
    items,
    initialStatus,
    initialError,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useBoardThreadsFeed(boardIdValue);

  if (initialStatus !== "success") {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: theme.canvas }]}>
        {initialStatus === "loading" ? (
          <ActivityIndicator />
        ) : (
          <Text style={{ color: theme.error }}>
            {initialStatus === "notFound" ? "版面不存在" : initialError ?? "加载失败"}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.canvas }]}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: Spacing.three, paddingBottom: Spacing.six }}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                {treeInfo ? (
                  <Text style={[styles.breadcrumb, { color: theme.ash }]}>
                    {treeInfo.section.name} › {treeInfo.sub.name}
                  </Text>
                ) : null}
                <Text style={[styles.boardName, { color: theme.ink }]}>
                  {board?.name ?? boardIdValue}
                </Text>
                {board?.description ? (
                  <Text style={[styles.boardDesc, { color: theme.inkSecondary }]}>
                    {board.description}
                  </Text>
                ) : null}
              </View>
              {boardIdValue ? (
                <Pressable onPress={() => toggle(boardIdValue)} hitSlop={8}>
                  <Text style={{ fontSize: 24 }}>
                    {isFavorite(boardIdValue) ? "⭐" : "☆"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <PostCard
            threadId={item.id.replace(/^thread:/, "")}
            title={item.title}
            authorName={item.authorName}
            replyCount={item.replyCount}
            time={item.lastReplyAt ? formatTime(item.lastReplyAt) : formatTime(item.publishedAt)}
          />
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
        ListEmptyComponent={
          <EmptyState icon="📋" title="暂无帖子" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: Spacing.six },
  header: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.three,
  },
  breadcrumb: { fontSize: 13, marginBottom: 4 },
  boardName: { fontSize: 24, fontWeight: "700" },
  boardDesc: { fontSize: 14, marginTop: 4 },
});
