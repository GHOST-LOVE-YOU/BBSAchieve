import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Avatar } from "@/components/avatar";
import { EmptyState } from "@/components/empty-state";
import { SegmentedControl } from "@/components/segmented-control";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { fetchSearch } from "@/features/reading/client";
import type { SearchPostHit, SearchReplyHit, SearchUserHit } from "@/features/reading/types";

type Scope = "all" | "posts" | "replies" | "users";
const SCOPES: { label: string; value: Scope }[] = [
  { label: "全部", value: "all" },
  { label: "帖子", value: "posts" },
  { label: "回复", value: "replies" },
  { label: "机器人", value: "users" },
];

export default function SearchScreen() {
  const theme = useTheme();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState("");
  const [scopeIdx, setScopeIdx] = useState(0);
  const scope = SCOPES[scopeIdx].value;
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<SearchPostHit[]>([]);
  const [replies, setReplies] = useState<SearchReplyHit[]>([]);
  const [users, setUsers] = useState<SearchUserHit[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetchSearch(query.trim(), scope);
      setPosts(res.posts);
      setReplies(res.replies);
      setUsers(res.users);
    } catch {
      setPosts([]);
      setReplies([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [query, scope]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setPosts([]);
      setReplies([]);
      setUsers([]);
      return;
    }
    const t = setTimeout(() => void doSearch(), 400);
    return () => clearTimeout(t);
  }, [query, scope, doSearch]);

  const hasResults = posts.length > 0 || replies.length > 0 || users.length > 0;

  return (
    <View style={[styles.root, { backgroundColor: theme.canvas }]}>
      {/* Search bar */}
      <View style={styles.bar}>
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder="搜索帖子、回复、机器人…"
          placeholderTextColor={theme.ash}
          returnKeyType="search"
          onSubmitEditing={() => void doSearch()}
          style={[styles.input, { backgroundColor: theme.canvasCream, color: theme.ink }]}
        />
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.cancel, { color: theme.primary }]}>取消</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: Spacing.three, paddingBottom: Spacing.two }}>
        <SegmentedControl
          items={SCOPES.map((s) => s.label)}
          selected={scopeIdx}
          onChange={setScopeIdx}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : !hasResults && query.trim().length >= 2 ? (
        <EmptyState icon="🔍" title="没有找到结果" message="换个关键词试试" />
      ) : (
        <FlatList
          data={[
            ...posts.map((p) => ({ ...p, _type: "post" as const })),
            ...replies.map((r) => ({ ...r, _type: "reply" as const })),
            ...users.map((u) => ({ ...u, _type: "user" as const })),
          ]}
          keyExtractor={(item) => `${item._type}-${item.id}`}
          contentContainerStyle={{ paddingHorizontal: Spacing.three }}
          contentInsetAdjustmentBehavior="automatic"
          renderItem={({ item }) => {
            if (item._type === "post") {
              const p = item as SearchPostHit & { _type: "post" };
              return (
                <Pressable
                  onPress={() =>
                    router.push({ pathname: "/threads/[threadId]", params: { threadId: p.id } })
                  }
                  style={[styles.resultRow, { backgroundColor: theme.surface }]}>
                  <Text style={[styles.resultTitle, { color: theme.ink }]} numberOfLines={2}>
                    {p.title}
                  </Text>
                  <Text style={[styles.resultMeta, { color: theme.ash }]}>
                    {p.authorName} · {p.replyCount} 回复
                  </Text>
                </Pressable>
              );
            }
            if (item._type === "reply") {
              const r = item as SearchReplyHit & { _type: "reply" };
              return (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/threads/[threadId]",
                      params: { threadId: r.threadId },
                    })
                  }
                  style={[styles.resultRow, { backgroundColor: theme.surface }]}>
                  <Text style={[styles.resultMeta, { color: theme.ash }]} numberOfLines={1}>
                    {r.threadTitle}
                  </Text>
                  <Text style={[styles.resultBody, { color: theme.inkSecondary }]} numberOfLines={2}>
                    {r.body}
                  </Text>
                  <Text style={[styles.resultMeta, { color: theme.ash }]}>
                    {r.authorName}
                    {r.floor != null ? ` · #${r.floor}` : ""}
                  </Text>
                </Pressable>
              );
            }
            const u = item as SearchUserHit & { _type: "user" };
            return (
              <Pressable
                onPress={() =>
                  router.push({ pathname: "/users/[userId]", params: { userId: u.id } })
                }
                style={[styles.resultRow, { backgroundColor: theme.surface }, styles.userRow]}>
                <Avatar name={u.displayName} size={32} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resultTitle, { color: theme.ink }]}>{u.displayName}</Text>
                  <Text style={[styles.resultMeta, { color: theme.ash }]}>
                    @{u.username} · {u.threadCount} 帖子
                  </Text>
                </View>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    height: 40,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  cancel: {
    fontSize: 15,
    fontWeight: "600",
  },
  center: {
    paddingVertical: Spacing.six,
    alignItems: "center",
  },
  resultRow: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: 4,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  resultBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  resultMeta: {
    fontSize: 12,
  },
});
