import { Link } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/empty-state";
import { PostCard } from "@/components/post-card";
import { SegmentedControl } from "@/components/segmented-control";
import { BottomTabInset, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useKindeUser } from "@/features/auth/useKindeUser";
import { useBoardFavorites } from "@/features/favorites/useBoardFavorites";
import { findBoardBySlug } from "@/features/favorites/boardTree";
import { fetchBookmarks } from "@/features/reading/client";
import type { BookmarkItem } from "@/features/reading/types";

export default function FavoritesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useKindeUser();
  const userId = user?.id ?? null;
  const { boardIds, toggle, isFavorite, loaded } = useBoardFavorites(userId);
  const [tab, setTab] = useState(0);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);

  useEffect(() => {
    if (tab === 1) {
      setBookmarksLoading(true);
      void fetchBookmarks()
        .then((r) => setBookmarks(r.items))
        .catch(() => setBookmarks([]))
        .finally(() => setBookmarksLoading(false));
    }
  }, [tab]);

  const bottomPad = Platform.select({
    ios: insets.bottom + BottomTabInset,
    default: BottomTabInset + Spacing.three,
  });

  return (
    <View style={[styles.root, { backgroundColor: theme.canvas }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.ink }]}>收藏</Text>
        <SegmentedControl items={["板块", "帖子"]} selected={tab} onChange={setTab} />
      </View>

      {tab === 0 ? (
        <FlatList
          data={[{ type: "browse" as const }, ...boardIds.map((id) => ({ type: "board" as const, id }))]}
          keyExtractor={(item) => (item.type === "browse" ? "__browse__" : (item as { id: string }).id)}
          contentContainerStyle={{ paddingHorizontal: Spacing.three, paddingBottom: bottomPad }}
          contentInsetAdjustmentBehavior="automatic"
          renderItem={({ item }) => {
            if (item.type === "browse") {
              return (
                <Link href="/browse" asChild>
                  <Pressable
                    style={StyleSheet.flatten([styles.browseRow, { backgroundColor: theme.surface }])}>
                    <Text style={[styles.browseText, { color: theme.primary }]}>
                      浏览所有分区 →
                    </Text>
                  </Pressable>
                </Link>
              );
            }
            const info = findBoardBySlug((item as { id: string }).id);
            if (!info) return null;
            return (
              <Link
                href={{ pathname: "/boards/[boardId]", params: { boardId: info.board.slug } }}
                asChild>
                <Pressable
                  style={StyleSheet.flatten([styles.boardRow, { backgroundColor: theme.surface }])}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.boardName, { color: theme.ink }]}>
                      {info.board.name}
                    </Text>
                    <Text style={[styles.boardDesc, { color: theme.ash }]}>
                      {info.board.desc}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => toggle(info.board.slug)}
                    hitSlop={8}>
                    <Text style={{ fontSize: 20 }}>
                      {isFavorite(info.board.slug) ? "⭐" : "☆"}
                    </Text>
                  </Pressable>
                </Pressable>
              </Link>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
          ListEmptyComponent={
            loaded ? (
              <EmptyState
                icon="⭐"
                title="还没有收藏板块"
                message="浏览分区，收藏感兴趣的板块"
              />
            ) : (
              <View style={styles.center}>
                <ActivityIndicator />
              </View>
            )
          }
        />
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ paddingHorizontal: Spacing.three, paddingBottom: bottomPad }}
          contentInsetAdjustmentBehavior="automatic"
          renderItem={({ item }) => (
            <PostCard
              threadId={item.threadId}
              title={item.threadTitle}
              excerpt={item.threadExcerpt}
              authorName={item.authorName}
              boardName={item.boardName}
              boardSlug={item.boardSlug}
              replyCount={item.replyCount}
              isBot={item.authorIsBot}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
          ListEmptyComponent={
            bookmarksLoading ? (
              <View style={styles.center}>
                <ActivityIndicator />
              </View>
            ) : (
              <EmptyState
                icon="🔖"
                title="还没有收藏帖子"
                message="在帖子详情页点击收藏按钮"
              />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  browseRow: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    alignItems: "center",
  },
  browseText: {
    fontSize: 15,
    fontWeight: "600",
  },
  boardRow: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  boardName: {
    fontSize: 16,
    fontWeight: "600",
  },
  boardDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  center: {
    paddingVertical: Spacing.six,
    alignItems: "center",
  },
});
