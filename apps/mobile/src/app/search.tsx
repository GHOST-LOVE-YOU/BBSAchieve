import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ColorValue,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { fetchSearch } from "@/features/reading/client";
import type { SearchPostHit, SearchReplyHit, SearchUserHit } from "@/features/reading/types";

type Scope = "posts" | "replies" | "users";
const SCOPES: { label: string; value: Scope }[] = [
  { label: "帖子", value: "posts" },
  { label: "回复", value: "replies" },
  { label: "机器人", value: "users" },
];

export default function SearchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [scopeIdx, setScopeIdx] = useState(0);
  const scope = SCOPES[scopeIdx].value;
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<SearchPostHit[]>([]);
  const [replies, setReplies] = useState<SearchReplyHit[]>([]);
  const [users, setUsers] = useState<SearchUserHit[]>([]);
  const searchVersionRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      searchVersionRef.current += 1;
    };
  }, []);

  const doSearch = useCallback(async (isActive: () => boolean = () => true) => {
    if (!query.trim()) return;
    searchVersionRef.current += 1;
    const searchVersion = searchVersionRef.current;
    const canUpdate = () =>
      mountedRef.current && isActive() && searchVersionRef.current === searchVersion;

    if (!canUpdate()) return;
    setLoading(true);
    try {
      const res = await fetchSearch(query.trim(), scope);
      if (!canUpdate()) return;
      setPosts(res.posts);
      setReplies(res.replies);
      setUsers(res.users);
    } catch {
      if (!canUpdate()) return;
      setPosts([]);
      setReplies([]);
      setUsers([]);
    } finally {
      if (!canUpdate()) return;
      setLoading(false);
    }
  }, [query, scope]);

  useEffect(() => {
    if (query.trim().length < 2) return;
    let active = true;
    const t = setTimeout(() => void doSearch(() => active), 400);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, scope, doSearch]);

  const trimmedQuery = query.trim();
  const hasResults = posts.length > 0 || replies.length > 0 || users.length > 0;
  const showResults = trimmedQuery.length >= 2;

  return (
    <View style={[styles.root, { backgroundColor: theme.canvas }]}>
      <View
        style={[
          styles.bar,
          {
            paddingTop: insets.top + 6,
            backgroundColor: theme.canvas,
            borderBottomColor: theme.hairlineSoft,
          },
        ]}>
        <View style={[styles.inputWrap, { backgroundColor: theme.canvasSoft }]}>
          <SearchIcon color={theme.inkTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="搜索帖子 / 回复 / 机器人"
            placeholderTextColor={theme.mute}
            returnKeyType="search"
            numberOfLines={1}
            onSubmitEditing={() => {
              Keyboard.dismiss();
              void doSearch();
            }}
            style={[styles.input, { color: theme.ink }]}
          />
          {query ? (
            <Pressable
              android_ripple={{ color: "transparent", borderless: true }}
              onPress={() => setQuery("")}
              hitSlop={8}>
              <ClearIcon color={theme.inkTertiary} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          android_ripple={{ color: "transparent", borderless: true }}
          hitSlop={8}
          onPress={() => {
            Keyboard.dismiss();
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/");
            }
          }}
          style={styles.cancelButton}>
          <Text style={[styles.cancel, { color: theme.inkSecondary }]}>取消</Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.tabs,
          {
            backgroundColor: theme.canvas,
            borderBottomColor: theme.hairlineSoft,
          },
        ]}>
        {SCOPES.map((item, index) => {
          const active = scopeIdx === index;
          return (
            <Pressable
              key={item.value}
              android_ripple={{ color: "transparent", borderless: false }}
              onPress={() => {
                Keyboard.dismiss();
                setScopeIdx(index);
              }}
              style={[
                styles.tab,
                {
                  backgroundColor: active ? theme.ink : theme.canvasSoft,
                },
              ]}>
              <Text style={[styles.tabText, { color: active ? theme.onPrimary : theme.inkSecondary }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : showResults && !hasResults ? (
        <SearchEmpty />
      ) : showResults ? (
        <FlatList
          data={[
            ...posts.map((p) => ({ ...p, _type: "post" as const })),
            ...replies.map((r) => ({ ...r, _type: "reply" as const })),
            ...users.map((u) => ({ ...u, _type: "user" as const })),
          ]}
          keyExtractor={(item) => `${item._type}-${item.id}`}
          contentContainerStyle={{ paddingBottom: Spacing.six }}
          contentInsetAdjustmentBehavior="automatic"
          renderItem={({ item }) => {
            if (item._type === "post") {
              const p = item as SearchPostHit & { _type: "post" };
              return (
                <Pressable
                  android_ripple={{ color: "transparent", borderless: false }}
                  onPress={() =>
                    router.push({ pathname: "/threads/[threadId]", params: { threadId: p.id } })
                  }
                  style={[
                    styles.resultRow,
                    { backgroundColor: theme.surface, borderBottomColor: theme.hairlineSoft },
                  ]}>
                  <ResultTypeIcon color={theme.inkTertiary} type="post" />
                  <View style={styles.resultContent}>
                    <Text style={[styles.resultTitle, { color: theme.ink }]} numberOfLines={2}>
                      {p.title}
                    </Text>
                    <Text style={[styles.resultMeta, { color: theme.inkTertiary }]}>
                      {p.authorName} · {p.replyCount} 回复
                    </Text>
                  </View>
                </Pressable>
              );
            }
            if (item._type === "reply") {
              const r = item as SearchReplyHit & { _type: "reply" };
              return (
                <Pressable
                  android_ripple={{ color: "transparent", borderless: false }}
                  onPress={() =>
                    router.push({
                      pathname: "/threads/[threadId]",
                      params: { threadId: r.threadId },
                    })
                  }
                  style={[
                    styles.resultRow,
                    { backgroundColor: theme.surface, borderBottomColor: theme.hairlineSoft },
                  ]}>
                  <ResultTypeIcon color={theme.inkTertiary} type="reply" />
                  <View style={styles.resultContent}>
                    <Text style={[styles.resultTitle, { color: theme.ink }]} numberOfLines={2}>
                      {r.body}
                    </Text>
                    <Text style={[styles.resultMeta, { color: theme.inkTertiary }]} numberOfLines={1}>
                      {r.authorName}
                      {r.floor != null ? ` · #${r.floor}` : ""} · 《{r.threadTitle}》
                    </Text>
                  </View>
                </Pressable>
              );
            }
            const u = item as SearchUserHit & { _type: "user" };
            return (
              <Pressable
                android_ripple={{ color: "transparent", borderless: false }}
                onPress={() =>
                  router.push({ pathname: "/users/[userId]", params: { userId: u.id } })
                }
                style={[
                  styles.resultRow,
                  { backgroundColor: theme.surface, borderBottomColor: theme.hairlineSoft },
                ]}>
                <Avatar name={u.displayName} size={32} />
                <View style={styles.resultContent}>
                  <Text style={[styles.resultTitle, { color: theme.ink }]}>{u.displayName}</Text>
                  <Text style={[styles.resultMeta, { color: theme.inkTertiary }]}>
                    @{u.username} · {u.threadCount} 帖子
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      ) : (
        <View style={styles.searchBody}>
          <Text style={[styles.eyebrow, { color: theme.ash }]}>最近搜索</Text>
          <View style={styles.recentChips}>
            {["保研 edge", "宿舍 空调", "字节 前端", "校园网"].map((item) => (
              <Pressable
                key={item}
                android_ripple={{ color: "transparent", borderless: false }}
                onPress={() => {
                  Keyboard.dismiss();
                  setQuery(item);
                }}
                style={[styles.recentChip, { backgroundColor: theme.canvasSoft }]}>
                <ClockIcon color={theme.inkTertiary} />
                <Text style={[styles.recentText, { color: theme.inkSecondary }]}>{item}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.eyebrow, { color: theme.ash }]}>站内仅机器人可被搜索</Text>
          <Text style={[styles.hint, { color: theme.inkTertiary }]}>
            真实用户身份不可被检索；查找镜像机器人可进入主页订阅具体帖子或回复。
          </Text>
        </View>
      )}
    </View>
  );
}

function SearchEmpty() {
  const theme = useTheme();
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <SearchIcon color={theme.inkTertiary} large />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.ink }]}>没有找到结果</Text>
      <Text style={[styles.emptySub, { color: theme.inkTertiary }]}>换个关键词试试</Text>
    </View>
  );
}

function SearchIcon({ color, large = false }: { color: ColorValue; large?: boolean }) {
  return (
    <View style={[styles.searchIcon, large && styles.searchIconLarge]}>
      <View style={[styles.searchCircle, large && styles.searchCircleLarge, { borderColor: color }]} />
      <View style={[styles.searchHandle, large && styles.searchHandleLarge, { backgroundColor: color }]} />
    </View>
  );
}

function ClearIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.clearIcon}>
      <View style={[styles.clearLineA, { backgroundColor: color }]} />
      <View style={[styles.clearLineB, { backgroundColor: color }]} />
    </View>
  );
}

function ClockIcon({ color }: { color: ColorValue }) {
  return (
    <View style={styles.clockIcon}>
      <View style={[styles.clockCircle, { borderColor: color }]} />
      <View style={[styles.clockHandHour, { backgroundColor: color }]} />
      <View style={[styles.clockHandMinute, { backgroundColor: color }]} />
    </View>
  );
}

function ResultTypeIcon({ color, type }: { color: ColorValue; type: "post" | "reply" }) {
  if (type === "reply") {
    return (
      <View style={styles.resultIcon}>
        <View style={[styles.replyStem, { backgroundColor: color }]} />
        <View style={[styles.replyTop, { backgroundColor: color }]} />
        <View style={[styles.replyArrowTop, { backgroundColor: color }]} />
        <View style={[styles.replyArrowBottom, { backgroundColor: color }]} />
      </View>
    );
  }

  return (
    <View style={styles.resultIcon}>
      <View style={[styles.bookCover, { borderColor: color }]} />
      <View style={[styles.bookLine, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inputWrap: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    minWidth: 0,
    padding: 0,
    fontSize: 14.5,
  },
  searchIcon: {
    width: 18,
    height: 18,
    position: "relative",
  },
  searchIconLarge: {
    width: 32,
    height: 32,
  },
  searchCircle: {
    position: "absolute",
    left: 1,
    top: 1,
    width: 11,
    height: 11,
    borderWidth: 2,
    borderRadius: 999,
  },
  searchCircleLarge: {
    left: 2,
    top: 2,
    width: 20,
    height: 20,
    borderWidth: 2.5,
  },
  searchHandle: {
    position: "absolute",
    right: 1,
    bottom: 2,
    width: 8,
    height: 2,
    borderRadius: 2,
    transform: [{ rotate: "45deg" }],
  },
  searchHandleLarge: {
    right: 3,
    bottom: 5,
    width: 13,
    height: 2.5,
  },
  clearIcon: {
    width: 16,
    height: 16,
    position: "relative",
  },
  clearLineA: {
    position: "absolute",
    left: 3,
    top: 7,
    width: 10,
    height: 2,
    borderRadius: 2,
    transform: [{ rotate: "45deg" }],
  },
  clearLineB: {
    position: "absolute",
    left: 3,
    top: 7,
    width: 10,
    height: 2,
    borderRadius: 2,
    transform: [{ rotate: "-45deg" }],
  },
  cancelButton: {
    minWidth: 44,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -6,
  },
  cancel: {
    fontSize: 13,
    fontWeight: "500",
  },
  center: {
    paddingVertical: Spacing.six,
    alignItems: "center",
  },
  searchBody: {
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 96,
  },
  emptyIconWrap: {
    opacity: 0.55,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12.5,
  },
  tabs: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  tabText: {
    fontSize: 12.5,
    fontWeight: "500",
  },
  eyebrow: {
    paddingHorizontal: Spacing.three,
    paddingTop: 10,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0,
  },
  recentChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  recentChip: {
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  clockIcon: {
    width: 11,
    height: 11,
    position: "relative",
  },
  clockCircle: {
    position: "absolute",
    inset: 1.2,
    borderWidth: 1.4,
    borderRadius: 999,
  },
  clockHandHour: {
    position: "absolute",
    left: 4.9,
    top: 3.1,
    width: 1.4,
    height: 3,
    borderRadius: 1,
  },
  clockHandMinute: {
    position: "absolute",
    left: 5,
    top: 5.2,
    width: 3.2,
    height: 1.4,
    borderRadius: 1,
  },
  recentText: {
    fontSize: 13,
    fontWeight: "500",
  },
  hint: {
    paddingHorizontal: Spacing.three,
    paddingTop: 6,
    paddingBottom: 8,
    fontSize: 12.5,
    lineHeight: 18,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultIcon: {
    width: 16,
    height: 16,
    marginTop: 2,
    position: "relative",
  },
  bookCover: {
    position: "absolute",
    left: 2,
    top: 1,
    width: 11,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 2,
  },
  bookLine: {
    position: "absolute",
    left: 5,
    top: 4,
    width: 5,
    height: 1.5,
    borderRadius: 1,
  },
  replyStem: {
    position: "absolute",
    left: 4,
    top: 5,
    width: 9,
    height: 2,
    borderRadius: 2,
  },
  replyTop: {
    position: "absolute",
    right: 3,
    top: 5,
    width: 2,
    height: 6,
    borderRadius: 2,
  },
  replyArrowTop: {
    position: "absolute",
    left: 3,
    top: 3,
    width: 6,
    height: 2,
    borderRadius: 2,
    transform: [{ rotate: "-45deg" }],
  },
  replyArrowBottom: {
    position: "absolute",
    left: 3,
    top: 7,
    width: 6,
    height: 2,
    borderRadius: 2,
    transform: [{ rotate: "45deg" }],
  },
  resultContent: {
    flex: 1,
    gap: 3,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  resultMeta: {
    fontSize: 11.5,
  },
});
