import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

import { MOBILE_TABBAR_SCROLL_GAP } from "@/components/bottom-tab-visuals";
import { PostCard } from "@/components/post-card";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useKindeUser } from "@/features/auth/useKindeUser";
import { useBoardFavorites } from "@/features/favorites/useBoardFavorites";
import { findBoardBySlug } from "@/features/favorites/boardTree";
import { fetchBookmarks } from "@/features/reading/client";
import type { BookmarkItem } from "@/features/reading/types";

export default function FavoritesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useKindeUser();
  const userId = user?.id ?? null;
  const { boardIds, toggle, isFavorite, loaded } = useBoardFavorites(userId);
  const [tab, setTab] = useState(0);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);

  useEffect(() => {
    if (tab === 1) {
      let active = true;

      const loadBookmarks = async () => {
        setBookmarksLoading(true);
        try {
          const r = await fetchBookmarks();
          if (active) setBookmarks(r.items);
        } catch {
          if (active) setBookmarks([]);
        } finally {
          if (active) setBookmarksLoading(false);
        }
      };

      void loadBookmarks();

      return () => {
        active = false;
      };
    }
  }, [tab]);

  const bottomPad = MOBILE_TABBAR_SCROLL_GAP + insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: theme.canvas }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={[styles.hero, { backgroundColor: theme.surfaceMauve }]}>
          <Text style={[styles.eyebrow, { color: theme.inkTertiary }]}>我的收藏</Text>
          <Text style={[styles.title, { color: theme.ink }]}>
            {tab === 0 ? `${boardIds.length} 个板块` : `${bookmarks.length} 个帖子`}
          </Text>
          <Text style={[styles.heroSub, { color: theme.inkSecondary }]}>
            板块 = 三级目录的最小单元（如「前端」「面经分享」）；帖子 = 你在帖子页点过收藏的内容。
          </Text>
        </View>
        <View style={[styles.segmented, { backgroundColor: theme.canvasCream }]}>
          {[
            { icon: "boards", label: "板块", count: boardIds.length },
            { icon: "posts", label: "帖子", count: bookmarks.length },
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
                {item.icon === "boards" ? (
                  <FolderMiniIcon color={active ? theme.ink : theme.ash} />
                ) : (
                  <BookmarkMiniIcon color={active ? theme.ink : theme.ash} />
                )}
                <Text style={[styles.segmentText, { color: active ? theme.ink : theme.ash }]}>
                  {item.label} <Text style={{ color: active ? theme.inkTertiary : theme.ash }}>{item.count}</Text>
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {tab === 0 ? (
        <FlatList
          data={boardIds}
          keyExtractor={(id) => id}
          contentContainerStyle={{ paddingBottom: bottomPad }}
          contentInsetAdjustmentBehavior="automatic"
          ListHeaderComponent={<BrowseBoardsCta />}
          renderItem={({ item }) => {
            const info = findBoardBySlug(item);
            if (!info) return null;
            return (
              <Pressable
                onPress={() =>
                  router.push({ pathname: "/boards/[boardId]", params: { boardId: info.board.slug } })
                }
                style={StyleSheet.flatten([
                  styles.boardRow,
                  { backgroundColor: theme.surface, borderColor: theme.hairline },
                ])}>
                <View style={[styles.boardIcon, { backgroundColor: theme.canvasCream }]}>
                  <Text style={[styles.boardIconText, { color: theme.inkSecondary }]}>
                    {info.board.name.slice(0, 1)}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.boardName, { color: theme.ink }]}>
                    {info.board.name}
                  </Text>
                  <Text style={[styles.boardDesc, { color: theme.ash }]}>
                    {info.section.icon} {info.section.name} · {info.sub.name}
                  </Text>
                </View>
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    toggle(info.board.slug);
                  }}
                  hitSlop={8}>
                  <FavoriteToggleIcon
                    color={isFavorite(info.board.slug) ? theme.primary : theme.inkTertiary}
                  />
                </Pressable>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
          ListEmptyComponent={
            loaded ? (
              <FavoriteEmpty
                kind="boards"
                title="还没有收藏的板块"
                message="点击上方按钮浏览全部分区，再把板块收藏到这里"
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
          contentContainerStyle={{ paddingBottom: bottomPad }}
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
              <FavoriteEmpty
                kind="posts"
                title="还没有收藏的帖子"
                message="在帖子详情页点「收藏」，帖子会出现在这里"
              />
            )
          }
        />
      )}
    </View>
  );
}

function FavoriteEmpty({
  kind,
  title,
  message,
}: {
  kind: "boards" | "posts";
  title: string;
  message: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.favEmpty,
        { backgroundColor: theme.canvasSoft, borderColor: theme.hairline },
      ]}>
      <View style={[styles.favEmptyIconWrap, { opacity: 0.55 }]}>
        {kind === "boards" ? (
          <FolderMiniIcon color={theme.inkTertiary} large />
        ) : (
          <BookmarkMiniIcon color={theme.inkTertiary} large />
        )}
      </View>
      <Text style={[styles.favEmptyTitle, { color: theme.ink }]}>{title}</Text>
      <Text style={[styles.favEmptySub, { color: theme.inkTertiary }]}>{message}</Text>
    </View>
  );
}

function BrowseBoardsCta() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => router.push("/browse")}
      style={({ pressed }) => [
        styles.browseRow,
        { backgroundColor: theme.surface, borderColor: theme.hairline },
        pressed && { backgroundColor: theme.canvasSoft },
      ]}>
      <View style={[styles.ctaIcon, { backgroundColor: theme.ink }]}>
        <FolderIcon color={theme.onPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.browseText, { color: theme.ink }]}>
          浏览所有分区，添加板块
        </Text>
        <Text style={[styles.browseMeta, { color: theme.inkTertiary }]}>
          分区 → 子分区 → 板块（最小单元）
        </Text>
      </View>
      <ChevronIcon color={theme.inkTertiary} />
    </Pressable>
  );
}

function FolderIcon({ color }: { color: string }) {
  return (
    <View style={styles.folderIcon}>
      <View style={[styles.folderTab, { borderColor: color }]} />
      <View style={[styles.folderBody, { borderColor: color }]} />
    </View>
  );
}

function FolderMiniIcon({
  color,
  large = false,
}: {
  color: ColorValue;
  large?: boolean;
}) {
  return (
    <View style={[styles.folderMiniIcon, large && styles.folderMiniIconLarge]}>
      <View style={[styles.folderMiniTab, large && styles.folderMiniTabLarge, { borderColor: color }]} />
      <View style={[styles.folderMiniBody, large && styles.folderMiniBodyLarge, { borderColor: color }]} />
    </View>
  );
}

function BookmarkMiniIcon({
  color,
  large = false,
}: {
  color: ColorValue;
  large?: boolean;
}) {
  return (
    <View style={[styles.bookmarkMiniIcon, large && styles.bookmarkMiniIconLarge]}>
      <View style={[styles.bookmarkMiniBody, large && styles.bookmarkMiniBodyLarge, { borderColor: color }]} />
      <View style={[styles.bookmarkMiniCutLeft, large && styles.bookmarkMiniCutLeftLarge, { backgroundColor: color }]} />
      <View style={[styles.bookmarkMiniCutRight, large && styles.bookmarkMiniCutRightLarge, { backgroundColor: color }]} />
    </View>
  );
}

function FavoriteToggleIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.favoriteToggleIcon}>
      <View style={[styles.favoriteCircle, { borderColor: color }]} />
      <View style={[styles.favoriteStem, { backgroundColor: color }]} />
      <View style={[styles.favoriteLeafLeft, { backgroundColor: color }]} />
      <View style={[styles.favoriteLeafRight, { backgroundColor: color }]} />
    </View>
  );
}

function ChevronIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.chevronIcon}>
      <View style={[styles.chevronLineTop, { backgroundColor: color }]} />
      <View style={[styles.chevronLineBottom, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingBottom: 12,
    gap: 6,
  },
  hero: {
    marginHorizontal: 14,
    marginBottom: 6,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 4,
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0,
  },
  title: {
    fontSize: 19,
    fontWeight: "500",
  },
  heroSub: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  segmented: {
    marginHorizontal: 14,
    flexDirection: "row",
    borderRadius: 12,
    padding: 4,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    borderRadius: 9,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "500",
  },
  browseRow: {
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ctaIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  folderIcon: {
    width: 20,
    height: 16,
    position: "relative",
  },
  folderTab: {
    position: "absolute",
    top: 1,
    left: 1,
    width: 9,
    height: 5,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  folderBody: {
    position: "absolute",
    left: 1,
    right: 1,
    bottom: 1,
    height: 12,
    borderWidth: 2,
    borderRadius: 3,
  },
  browseText: {
    fontSize: 14,
    fontWeight: "500",
  },
  browseMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  chevronIcon: {
    width: 16,
    height: 16,
    position: "relative",
  },
  chevronLineTop: {
    position: "absolute",
    right: 4,
    top: 4,
    width: 8,
    height: 1.8,
    borderRadius: 2,
    transform: [{ rotate: "45deg" }],
  },
  chevronLineBottom: {
    position: "absolute",
    right: 4,
    bottom: 4.5,
    width: 8,
    height: 1.8,
    borderRadius: 2,
    transform: [{ rotate: "-45deg" }],
  },
  boardRow: {
    marginHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  boardIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  boardIconText: {
    fontSize: 14,
    fontWeight: "600",
  },
  boardName: {
    fontSize: 14.5,
    fontWeight: "500",
  },
  boardDesc: {
    fontSize: 11.5,
    marginTop: 3,
  },
  center: {
    paddingVertical: Spacing.six,
    alignItems: "center",
  },
  favEmpty: {
    marginHorizontal: 14,
    marginTop: 24,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: "dashed",
    paddingHorizontal: 24,
    paddingVertical: 36,
    alignItems: "center",
  },
  favEmptyIconWrap: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  favEmptyTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  favEmptySub: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    textAlign: "center",
  },
  folderMiniIcon: {
    width: 15,
    height: 13,
    position: "relative",
  },
  folderMiniIconLarge: {
    width: 24,
    height: 21,
  },
  folderMiniTab: {
    position: "absolute",
    left: 1,
    top: 1,
    width: 7,
    height: 4,
    borderTopWidth: 1.7,
    borderLeftWidth: 1.7,
    borderRightWidth: 1.7,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  folderMiniTabLarge: {
    left: 2,
    top: 2,
    width: 11,
    height: 6,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
  },
  folderMiniBody: {
    position: "absolute",
    left: 1,
    right: 1,
    bottom: 1,
    height: 10,
    borderWidth: 1.7,
    borderRadius: 3,
  },
  folderMiniBodyLarge: {
    left: 2,
    right: 2,
    bottom: 2,
    height: 16,
    borderWidth: 2,
    borderRadius: 5,
  },
  bookmarkMiniIcon: {
    width: 13,
    height: 15,
    position: "relative",
  },
  bookmarkMiniIconLarge: {
    width: 22,
    height: 26,
  },
  bookmarkMiniBody: {
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
  bookmarkMiniBodyLarge: {
    top: 2,
    left: 3,
    width: 16,
    height: 20,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  bookmarkMiniCutLeft: {
    position: "absolute",
    left: 3,
    bottom: 2,
    width: 6,
    height: 1.7,
    borderRadius: 2,
    transform: [{ rotate: "32deg" }],
  },
  bookmarkMiniCutLeftLarge: {
    left: 4,
    bottom: 4,
    width: 10,
    height: 2,
  },
  bookmarkMiniCutRight: {
    position: "absolute",
    right: 3,
    bottom: 2,
    width: 6,
    height: 1.7,
    borderRadius: 2,
    transform: [{ rotate: "-32deg" }],
  },
  bookmarkMiniCutRightLarge: {
    right: 4,
    bottom: 4,
    width: 10,
    height: 2,
  },
  favoriteToggleIcon: {
    width: 22,
    height: 22,
    position: "relative",
  },
  favoriteCircle: {
    position: "absolute",
    left: 5,
    top: 3,
    width: 12,
    height: 12,
    borderWidth: 1.8,
    borderRadius: 999,
  },
  favoriteStem: {
    position: "absolute",
    left: 10,
    top: 13,
    width: 2,
    height: 6,
    borderRadius: 2,
  },
  favoriteLeafLeft: {
    position: "absolute",
    left: 6,
    top: 14,
    width: 6,
    height: 2,
    borderRadius: 2,
    transform: [{ rotate: "-35deg" }],
  },
  favoriteLeafRight: {
    position: "absolute",
    right: 6,
    top: 14,
    width: 6,
    height: 2,
    borderRadius: 2,
    transform: [{ rotate: "35deg" }],
  },
});
