import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link } from "expo-router";

import { PostCard } from "@/components/post-card";
import { EmptyState } from "@/components/empty-state";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useFeed } from "@/features/reading/useFeed";
import type { FeedThreadItem } from "@/features/reading/types";

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 3600_000) return `${Math.max(1, Math.floor(diff / 60_000))}分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}小时前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const PILL_COLORS = ["blue", "green", "yellow", "mauve", "turquoise", "red"] as const;
function boardPillColor(slug: string) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) | 0;
  return PILL_COLORS[Math.abs(h) % PILL_COLORS.length];
}

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const feed = useFeed("bot", 15);

  const renderItem = useCallback(
    ({ item }: { item: FeedThreadItem }) => (
      <PostCard
        threadId={item.id}
        title={item.title}
        excerpt={item.excerpt}
        authorName={item.authorName}
        boardName={item.boardName}
        boardSlug={item.boardSlug}
        replyCount={item.replyCount}
        time={formatTime(item.publishedAt)}
        pillColor={boardPillColor(item.boardSlug)}
        isBot={item.authorIsBot}
      />
    ),
    [],
  );

  const footer = feed.isLoadingMore ? (
    <View style={styles.footer}>
      <ActivityIndicator />
    </View>
  ) : null;

  const bottomPad = Platform.select({ ios: insets.bottom + BottomTabInset, default: BottomTabInset + Spacing.three });

  return (
    <View style={[styles.root, { backgroundColor: theme.canvas }]}>
      <FlatList
        data={feed.items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: bottomPad, paddingHorizontal: Spacing.three }}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          <View style={styles.hero}>
            <Text style={[styles.heroTitle, { color: theme.ink }]}>
              机器人镜像信息流
            </Text>
            <Text style={[styles.heroSub, { color: theme.inkSecondary }]}>
              {feed.totalCount > 0
                ? `共 ${feed.totalCount} 条镜像帖子`
                : "来自 BYR 论坛的实时镜像"}
            </Text>
            <Link href="/search" asChild>
              <Text style={[styles.searchHint, { color: theme.ash, backgroundColor: theme.canvasCream }]}>
                🔍 搜索帖子、回复、机器人…
              </Text>
            </Link>
          </View>
        }
        ListEmptyComponent={
          feed.status === "loading" ? (
            <View style={styles.center}>
              <ActivityIndicator />
            </View>
          ) : feed.status === "error" ? (
            <EmptyState icon="⚠️" title="加载失败" message={feed.error ?? "请稍后重试"} />
          ) : (
            <EmptyState icon="📭" title="暂无帖子" />
          )
        }
        ListFooterComponent={footer}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
        onEndReached={() => void feed.loadMore()}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={feed.status === "loading" && feed.items.length > 0}
            onRefresh={() => void feed.refresh()}
            tintColor={theme.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 14,
  },
  searchHint: {
    fontSize: 14,
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    borderRadius: 10,
    overflow: "hidden",
    marginTop: Spacing.two,
  },
  center: {
    paddingVertical: Spacing.six,
    alignItems: "center",
  },
  footer: {
    paddingVertical: Spacing.four,
    alignItems: "center",
  },
});
