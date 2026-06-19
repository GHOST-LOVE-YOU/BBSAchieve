import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  type ColorValue,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PostCard } from "@/components/post-card";
import { EmptyState } from "@/components/empty-state";
import {
  FloatingBottomTabs,
  MOBILE_TABBAR_SCROLL_GAP,
  type BottomTabKey,
} from "@/components/bottom-tab-visuals";
import { Spacing } from "@/constants/theme";
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
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useKindeUser();
  const userId = user?.id ?? null;
  const { toggle, isFavorite } = useBoardFavorites(userId);
  const treeInfo = boardIdValue ? findBoardBySlug(boardIdValue) : null;
  const favorited = boardIdValue ? isFavorite(boardIdValue) : false;

  const {
    board,
    items,
    initialStatus,
    initialError,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useBoardThreadsFeed(boardIdValue);

  const canShowLocalBoard = initialStatus === "notFound" && treeInfo;
  const handleTabPress = (key: BottomTabKey) => {
    if (key === "home") router.push("/");
    if (key === "favorites") router.push("/favorites");
    if (key === "notifications") router.push("/notifications");
    if (key === "profile") router.push("/profile");
  };

  if (initialStatus !== "success" && !canShowLocalBoard) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: theme.canvas }]}>
        <Stack.Screen options={{ title: treeInfo?.board.name ?? "版面" }} />
        {initialStatus === "loading" ? (
          <ActivityIndicator />
        ) : (
          <Text style={{ color: theme.error }}>
            {initialStatus === "notFound" ? "版面不存在" : initialError ?? "加载失败"}
          </Text>
        )}
        <FloatingBottomTabs active="favorites" onPress={handleTabPress} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.canvas }]}>
      <Stack.Screen options={{ title: board?.name ?? treeInfo?.board.name ?? "版面" }} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: MOBILE_TABBAR_SCROLL_GAP + insets.bottom }}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          <View style={[styles.header, { backgroundColor: theme.surfacePeach }]}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                {treeInfo ? (
                  <Text style={[styles.breadcrumb, { color: theme.ash }]}>
                    {treeInfo.section.icon} {treeInfo.section.name} · {treeInfo.sub.name}
                  </Text>
                ) : null}
                <Text style={[styles.boardName, { color: theme.ink }]}>
                  {board?.name ?? treeInfo?.board.name ?? boardIdValue}
                </Text>
                {board?.description || treeInfo?.board.desc ? (
                  <Text style={[styles.boardDesc, { color: theme.inkSecondary }]}>
                    {board?.description ?? treeInfo?.board.desc}
                  </Text>
                ) : null}
                <View style={styles.headerActions}>
                  {boardIdValue ? (
                    <Pressable
                      onPress={() => toggle(boardIdValue)}
                      hitSlop={8}
                      android_ripple={{ color: "transparent", borderless: false }}
                      style={[
                        styles.favoriteButton,
                        {
                          backgroundColor: favorited ? "rgba(255,255,255,0.66)" : theme.primary,
                          borderColor: favorited ? theme.hairline : theme.primary,
                        },
                      ]}>
                      <BookmarkMiniIcon color={favorited ? theme.inkSecondary : theme.onPrimary} filled={favorited} />
                      <Text style={[styles.favoriteText, { color: favorited ? theme.inkSecondary : theme.onPrimary }]}>
                        {favorited ? "已收藏板块" : "收藏板块"}
                      </Text>
                    </Pressable>
                  ) : null}
                  <View style={[styles.stat, { backgroundColor: "rgba(255,255,255,0.55)" }]}>
                    <Text style={[styles.statStrong, { color: theme.ink }]}>
                      {items.length.toLocaleString()}
                    </Text>
                    <Text style={[styles.statText, { color: theme.inkSecondary }]}>总帖数</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <PostCard
            threadId={item.id.replace(/^thread:/, "")}
            title={item.title}
            authorName={item.authorName}
            boardName={board?.name ?? treeInfo?.board.name}
            boardSlug={board?.slug ?? treeInfo?.board.slug}
            replyCount={item.replyCount}
            time={item.lastReplyAt ? formatTime(item.lastReplyAt) : formatTime(item.publishedAt)}
            isBot
          />
        )}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.hairlineSoft }]} />}
        onEndReached={() => {
          if (initialStatus === "success" && hasMore && !isLoadingMore) void loadMore();
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
      <FloatingBottomTabs active="favorites" onPress={handleTabPress} />
    </View>
  );
}

function BookmarkMiniIcon({
  color,
  filled,
}: {
  color: ColorValue;
  filled: boolean;
}) {
  return (
    <View style={styles.bookmarkIcon}>
      <View
        style={[
          styles.bookmarkBody,
          {
            borderColor: color,
            backgroundColor: filled ? color : "transparent",
          },
        ]}
      />
      <View
        style={[
          styles.bookmarkCutLeft,
          {
            backgroundColor: color,
          },
        ]}
      />
      <View
        style={[
          styles.bookmarkCutRight,
          {
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: Spacing.six },
  header: {
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 18,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.three,
  },
  breadcrumb: { fontSize: 10.5, fontWeight: "700", letterSpacing: 0, marginBottom: 4 },
  boardName: { fontSize: 20, fontWeight: "500", lineHeight: 26 },
  boardDesc: { fontSize: 13.5, marginTop: 6, lineHeight: 20 },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
  },
  favoriteButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  favoriteText: { fontSize: 12.5, fontWeight: "600" },
  bookmarkIcon: {
    width: 13,
    height: 15,
    position: "relative",
  },
  bookmarkBody: {
    position: "absolute",
    top: 1,
    left: 2,
    width: 9,
    height: 12,
    borderTopWidth: 1.7,
    borderLeftWidth: 1.7,
    borderRightWidth: 1.7,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  bookmarkCutLeft: {
    position: "absolute",
    left: 3,
    bottom: 2,
    width: 6,
    height: 1.7,
    borderRadius: 2,
    transform: [{ rotate: "32deg" }],
  },
  bookmarkCutRight: {
    position: "absolute",
    right: 3,
    bottom: 2,
    width: 6,
    height: 1.7,
    borderRadius: 2,
    transform: [{ rotate: "-32deg" }],
  },
  stat: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statStrong: { fontSize: 15, fontWeight: "600" },
  statText: { fontSize: 12, fontWeight: "500" },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 62,
    marginRight: 14,
  },
});
