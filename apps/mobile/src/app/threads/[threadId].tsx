import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ColorValue,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar";
import { Pill } from "@/components/pill";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useThreadRepliesFeed } from "@/features/reading/useThreadRepliesFeed";
import {
  toggleBookmark,
  checkBookmarked,
  createSubscription,
} from "@/features/reading/client";
import type { ReplyItem } from "@/features/reading/types";

const COMPOSER_TOP_PAD = 10;
const COMPOSER_INPUT_HEIGHT = 40;
const COMPOSER_BOTTOM_PAD = 20;
const COMPOSER_SCROLL_GAP = COMPOSER_TOP_PAD + COMPOSER_INPUT_HEIGHT + COMPOSER_BOTTOM_PAD + 20;

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function ThreadPage() {
  const { threadId } = useLocalSearchParams<{ threadId?: string | string[] }>();
  const threadIdValue = Array.isArray(threadId) ? threadId[0] : threadId;
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(false);
  const [onlyOP, setOnlyOP] = useState(false);
  const [subscribedReplyIds, setSubscribedReplyIds] = useState<Set<string>>(() => new Set());

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
    let active = true;

    if (threadIdValue) {
      void checkBookmarked(threadIdValue)
        .then((r) => {
          if (active) setBookmarked(r.bookmarked);
        })
        .catch(() => {});
    }

    return () => {
      active = false;
    };
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

  const handleSubscribeReply = useCallback(
    async (replyId: string) => {
      if (!threadIdValue) return;
      await createSubscription({ targetType: "reply", threadId: threadIdValue, replyId });
      setSubscribedReplyIds((prev) => {
        const next = new Set(prev);
        next.add(replyId);
        return next;
      });
    },
    [threadIdValue],
  );

  const displayItems = onlyOP && thread
    ? items.filter((r) => r.authorName === thread.authorName)
    : items;
  const composerBottomPad = Math.max(insets.bottom + COMPOSER_BOTTOM_PAD, COMPOSER_BOTTOM_PAD);
  const listBottomPad = COMPOSER_SCROLL_GAP + composerBottomPad;

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
        contentContainerStyle={{ paddingBottom: listBottomPad }}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          thread ? (
            <>
            <View
              style={[
                styles.header,
                {
                  backgroundColor: theme.surface,
                  borderBottomColor: theme.hairlineSoft,
                },
              ]}>
              <View style={[styles.mirrorBanner, { backgroundColor: theme.surfaceSky }]}>
                <Text style={[styles.mirrorText, { color: theme.inkSecondary }]}>
                  镜像帖 · 同步自 BYR 论坛
                </Text>
                <Text style={[styles.mirrorLink, { color: theme.primary }]}>查看源帖 →</Text>
              </View>

              {board ? (
                <View style={styles.boardRow}>
                  <Pressable
                    android_ripple={{ color: "transparent", borderless: false }}
                    onPress={() =>
                      router.push({
                        pathname: "/boards/[boardId]",
                        params: { boardId: board.slug },
                      })
                    }>
                    <Pill label={board.name} color="mauve" />
                  </Pressable>
                </View>
              ) : null}

              <Text style={[styles.title, { color: theme.ink }]}>{thread.title}</Text>

              <View style={styles.authorRow}>
                <Avatar name={thread.authorName} size={40} />
                <View>
                  <Text style={[styles.authorName, { color: theme.ink }]}>
                    {thread.authorName}
                  </Text>
                  <Text style={[styles.authorTime, { color: theme.ash }]}>
                    {formatTime(thread.publishedAt)} · {thread.replyCount} 回复
                  </Text>
                </View>
              </View>

              <Text style={[styles.body, { color: theme.ink }]}>{thread.body}</Text>

              <View style={[styles.actions, { borderTopColor: theme.hairlineSoft }]}>
                <Pressable
                  android_ripple={{ color: "transparent", borderless: false }}
                  onPress={() => void handleSubscribe()}
                  style={[styles.actionBtn, { backgroundColor: theme.primary }]}>
                  <BellMiniIcon color={theme.onPrimary} />
                  <Text style={[styles.actionText, { color: theme.onPrimary }]}>订阅该帖</Text>
                </Pressable>
                <Pressable
                  android_ripple={{ color: "transparent", borderless: false }}
                  onPress={() => void handleBookmark()}
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: theme.canvasSoft,
                    },
                  ]}>
                  <BookmarkMiniIcon color={bookmarked ? theme.primary : theme.ink} />
                  <Text style={[styles.actionText, { color: bookmarked ? theme.primary : theme.ink }]}>
                    {bookmarked ? "已收藏" : "收藏"}
                  </Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.replyHeaderRow}>
              <Text style={[styles.replyHeader, { color: theme.ink }]}>
                {thread.replyCount} 条回复
              </Text>
              <Pressable
                android_ripple={{ color: "transparent", borderless: false }}
                onPress={() => setOnlyOP((v) => !v)}
                style={[
                  styles.filterBtn,
                  {
                    backgroundColor: onlyOP ? theme.ink : theme.canvasSoft,
                  },
                ]}>
                <UserMiniIcon color={onlyOP ? theme.onPrimary : theme.inkSecondary} />
                <Text style={[styles.filterText, { color: onlyOP ? theme.onPrimary : theme.inkSecondary }]}>
                  仅看楼主
                </Text>
              </Pressable>
            </View>
            </>
          ) : null
        }
        renderItem={({ item }: { item: ReplyItem }) => (
          <View
            style={[
              styles.replyCard,
              {
                backgroundColor: theme.surface,
                borderBottomColor: theme.hairlineSoft,
              },
            ]}>
            <Avatar name={item.authorName} size={36} />
            <View style={styles.replyContent}>
              <View style={styles.replyTop}>
                <Text style={[styles.replyAuthor, { color: theme.ink }]}>{item.authorName}</Text>
                <Text style={[styles.replyMeta, { color: theme.inkTertiary }]}>
                  #{item.replyIndex} · {formatTime(item.publishedAt)}
                </Text>
              </View>
              <Text style={[styles.replyBody, { color: theme.ink }]}>{item.body}</Text>
              <View style={styles.replyActions}>
                <Pressable
                  android_ripple={{ color: "transparent", borderless: false }}
                  onPress={() => void handleSubscribeReply(item.id)}
                  style={[styles.replyActionBtn, { backgroundColor: theme.canvasCream }]}>
                  {subscribedReplyIds.has(item.id) ? (
                    <CheckMiniIcon color={theme.inkSecondary} />
                  ) : (
                    <BellMiniIcon color={theme.inkSecondary} small />
                  )}
                  <Text style={[styles.replyActionText, { color: theme.inkSecondary }]}>
                    {subscribedReplyIds.has(item.id) ? "已订阅" : "订阅楼"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
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
      <View
        style={[
          styles.composer,
          {
            backgroundColor: theme.canvas,
            borderTopColor: theme.hairlineSoft,
            paddingBottom: composerBottomPad,
          },
        ]}>
        <TextInput
          editable={false}
          placeholder="写下你的回复…"
          placeholderTextColor={theme.inkTertiary}
          style={[
            styles.composerInput,
            {
              backgroundColor: theme.canvasSoft,
              color: theme.ink,
            },
          ]}
        />
        <Pressable
          android_ripple={{ color: "transparent", borderless: false }}
          style={[styles.composerButton, { backgroundColor: theme.primary }]}>
          <SendIcon color={theme.onPrimary} />
          <Text style={[styles.composerButtonText, { color: theme.onPrimary }]}>回复</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SendIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.sendIcon}>
      <View style={[styles.sendWingTop, { borderTopColor: color }]} />
      <View style={[styles.sendWingBottom, { borderBottomColor: color }]} />
      <View style={[styles.sendTrail, { backgroundColor: color }]} />
    </View>
  );
}

function BellMiniIcon({ color, small = false }: { color: ColorValue; small?: boolean }) {
  return (
    <View style={[styles.bellMiniIcon, small && styles.bellMiniIconSmall]}>
      <View style={[styles.bellMiniDome, { borderColor: color }]} />
      <View style={[styles.bellMiniBase, { backgroundColor: color }]} />
      <View style={[styles.bellMiniDot, { backgroundColor: color }]} />
    </View>
  );
}

function BookmarkMiniIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.bookmarkMiniIcon}>
      <View
        style={[
          styles.bookmarkMiniBody,
          { borderColor: color },
        ]}
      />
      <View style={[styles.bookmarkMiniCutLeft, { backgroundColor: color }]} />
      <View style={[styles.bookmarkMiniCutRight, { backgroundColor: color }]} />
    </View>
  );
}

function UserMiniIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.userMiniIcon}>
      <View style={[styles.userMiniHead, { borderColor: color }]} />
      <View style={[styles.userMiniShoulders, { borderColor: color }]} />
    </View>
  );
}

function CheckMiniIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.checkMiniIcon}>
      <View style={[styles.checkMiniStem, { backgroundColor: color }]} />
      <View style={[styles.checkMiniArm, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: Spacing.six },
  header: {
    gap: 14,
    paddingHorizontal: Spacing.three,
    paddingTop: 12,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mirrorBanner: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  mirrorText: { fontSize: 12, fontWeight: "500", flex: 1 },
  mirrorLink: { fontSize: 12, fontWeight: "600" },
  boardRow: { flexDirection: "row" },
  title: { fontSize: 21, fontWeight: "500", lineHeight: 28 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  authorName: { fontSize: 14, fontWeight: "500" },
  authorTime: { fontSize: 12 },
  body: { fontSize: 15, lineHeight: 25 },
  actions: {
    flexDirection: "row",
    gap: Spacing.two,
    flexWrap: "wrap",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    marginTop: 2,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  actionText: { fontSize: 12.5, fontWeight: "600" },
  replyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    paddingTop: 14,
    paddingBottom: Spacing.two,
  },
  replyHeader: { fontSize: 13.5, fontWeight: "600", flex: 1 },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 50,
  },
  filterText: { fontSize: 12, fontWeight: "600" },
  replyCard: {
    flexDirection: "row",
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  replyContent: { flex: 1, gap: Spacing.one },
  replyTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    flexWrap: "wrap",
  },
  replyAuthor: { fontSize: 13.5, fontWeight: "500" },
  replyMeta: { fontSize: 11 },
  replyBody: { fontSize: 14, lineHeight: 22.4 },
  replyActions: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  replyActionBtn: {
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  replyActionText: {
    fontSize: 11.5,
    fontWeight: "500",
  },
  composer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 41,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  composerInput: {
    flex: 1,
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
  },
  composerButton: {
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  composerButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  sendIcon: {
    width: 14,
    height: 14,
    position: "relative",
  },
  sendWingTop: {
    position: "absolute",
    left: 1,
    top: 1,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderLeftWidth: 12,
    borderLeftColor: "transparent",
  },
  sendWingBottom: {
    position: "absolute",
    left: 1,
    bottom: 1,
    width: 0,
    height: 0,
    borderBottomWidth: 6,
    borderLeftWidth: 12,
    borderLeftColor: "transparent",
  },
  sendTrail: {
    position: "absolute",
    left: 4,
    top: 6.25,
    width: 6,
    height: 1.5,
    borderRadius: 1,
  },
  bellMiniIcon: {
    width: 13,
    height: 13,
    position: "relative",
  },
  bellMiniIconSmall: {
    width: 12,
    height: 12,
  },
  bellMiniDome: {
    position: "absolute",
    left: 2,
    top: 1.5,
    width: 9,
    height: 9,
    borderTopWidth: 1.6,
    borderLeftWidth: 1.6,
    borderRightWidth: 1.6,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  bellMiniBase: {
    position: "absolute",
    left: 1,
    right: 1,
    bottom: 2,
    height: 1.6,
    borderRadius: 2,
  },
  bellMiniDot: {
    position: "absolute",
    left: 5.2,
    bottom: 0,
    width: 2.6,
    height: 2.6,
    borderRadius: 2,
  },
  bookmarkMiniIcon: {
    width: 12,
    height: 14,
    position: "relative",
  },
  bookmarkMiniBody: {
    position: "absolute",
    top: 1,
    left: 2,
    width: 8,
    height: 11,
    borderTopWidth: 1.6,
    borderLeftWidth: 1.6,
    borderRightWidth: 1.6,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  bookmarkMiniCutLeft: {
    position: "absolute",
    left: 3,
    bottom: 2,
    width: 5.5,
    height: 1.6,
    borderRadius: 2,
    transform: [{ rotate: "32deg" }],
  },
  bookmarkMiniCutRight: {
    position: "absolute",
    right: 3,
    bottom: 2,
    width: 5.5,
    height: 1.6,
    borderRadius: 2,
    transform: [{ rotate: "-32deg" }],
  },
  userMiniIcon: {
    width: 13,
    height: 13,
    position: "relative",
  },
  userMiniHead: {
    position: "absolute",
    top: 0,
    left: 4,
    width: 5,
    height: 5,
    borderWidth: 1.5,
    borderRadius: 5,
  },
  userMiniShoulders: {
    position: "absolute",
    left: 1.5,
    bottom: 0,
    width: 10,
    height: 6,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
  checkMiniIcon: {
    width: 11,
    height: 11,
    position: "relative",
  },
  checkMiniStem: {
    position: "absolute",
    left: 2.2,
    top: 6,
    width: 4.2,
    height: 1.6,
    borderRadius: 2,
    transform: [{ rotate: "45deg" }],
  },
  checkMiniArm: {
    position: "absolute",
    right: 1,
    top: 4.3,
    width: 7.6,
    height: 1.6,
    borderRadius: 2,
    transform: [{ rotate: "-45deg" }],
  },
});
