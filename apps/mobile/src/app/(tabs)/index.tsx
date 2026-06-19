import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { PostCard } from "@/components/post-card";
import { EmptyState } from "@/components/empty-state";
import { MOBILE_TABBAR_SCROLL_GAP } from "@/components/bottom-tab-visuals";
import { Radius, Spacing } from "@/constants/theme";
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
  const router = useRouter();
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

  const bottomPad = MOBILE_TABBAR_SCROLL_GAP + insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: theme.canvas }]}>
      <View
        style={[
          styles.topbar,
          {
            backgroundColor: theme.canvas,
            borderBottomColor: theme.hairlineSoft,
            paddingTop: insets.top + 6,
          },
        ]}>
        <View style={[styles.brandMark, { backgroundColor: theme.inkStrong }]}>
          <Text style={[styles.brandLetter, { color: theme.canvas }]}>B</Text>
        </View>
        <Text style={[styles.brandText, { color: theme.ink }]}>
          BYR <Text style={{ color: theme.primary }}>Achieve</Text>
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="搜索"
          android_ripple={{ color: "transparent", borderless: true }}
          hitSlop={8}
          onPress={() => router.push({ pathname: "/search" })}
          style={[
            styles.iconButton,
            { backgroundColor: "transparent" },
          ]}>
          <SearchIcon color={theme.inkSecondary} />
        </Pressable>
      </View>
      <FlatList
        data={feed.items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          <View>
            <View style={[styles.hero, { backgroundColor: theme.surfaceBlush }]}>
              <Text style={[styles.eyebrow, { color: theme.inkTertiary }]}>机器人镜像信息流</Text>
              <Text style={[styles.heroTitle, { color: theme.ink }]}>
                今天，机器人替你巡视北邮人论坛
              </Text>
              <Text style={[styles.heroSub, { color: theme.inkSecondary }]}>
                每条镜像内容都以机器人身份发帖回帖。按最新回复排序。
              </Text>
              <View style={[styles.stat, { backgroundColor: "rgba(255,255,255,0.55)" }]}>
                <Text style={[styles.statStrong, { color: theme.ink }]}>{feed.totalCount || feed.items.length}</Text>
                <Text style={[styles.statText, { color: theme.inkSecondary }]}>今日镜像帖</Text>
              </View>
            </View>
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
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.hairlineSoft }]} />
        )}
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

function SearchIcon({ color }: { color: string }) {
  return (
    <View style={styles.searchIcon}>
      <View style={[styles.searchLens, { borderColor: color }]} />
      <View style={[styles.searchHandle, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  brandMark: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  brandLetter: {
    fontSize: 13,
    fontWeight: "700",
  },
  brandText: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 20,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  searchIcon: {
    width: 19,
    height: 19,
    position: "relative",
  },
  searchLens: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 14,
    height: 14,
    borderRadius: 14,
    borderWidth: 2,
  },
  searchHandle: {
    position: "absolute",
    right: 0,
    bottom: 2,
    width: 8,
    height: 2,
    borderRadius: 2,
    transform: [{ rotate: "45deg" }],
  },
  hero: {
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 18,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 8,
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "500",
    lineHeight: 26,
  },
  heroSub: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  stat: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    borderRadius: Radius.pillLg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 4,
  },
  statStrong: {
    fontSize: 15,
    fontWeight: "600",
  },
  statText: {
    fontSize: 12,
    fontWeight: "500",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
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
