import { FlatList, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { useThreadRepliesFeed } from "@/features/reading/useThreadRepliesFeed";

function getStatusText(status: "loading" | "notFound" | "error", message: string | null) {
  if (status === "notFound") {
    return "帖子不存在";
  }

  if (status === "error") {
    return message ? `读取失败：${message}` : "读取失败";
  }

  return "加载中";
}

export default function ThreadPage() {
  const { threadId } = useLocalSearchParams<{ threadId?: string | string[] }>();
  const threadIdValue = Array.isArray(threadId) ? threadId[0] : threadId;
  const {
    thread,
    items,
    initialStatus,
    initialError,
    loadMoreError,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useThreadRepliesFeed(threadIdValue);

  if (initialStatus !== "success") {
    return (
      <View style={{ flex: 1, padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: "600" }}>帖子详情</Text>
        <Text>{getStatusText(initialStatus, initialError)}</Text>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={{ padding: 24, gap: 16 }}
      data={items}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 28, fontWeight: "600" }}>{thread?.title ?? "帖子详情"}</Text>
          {thread ? (
            <View style={{ gap: 8 }}>
              <Text>{thread.body}</Text>
              <Text>{thread.authorName}</Text>
            </View>
          ) : null}
        </View>
      }
      ListFooterComponent={
        loadMoreError ? (
          <Text accessibilityRole="alert" style={{ paddingTop: 8 }}>
            读取失败：{loadMoreError}
          </Text>
        ) : null
      }
      onEndReached={() => {
        if (hasMore && !isLoadingMore) {
          void loadMore();
        }
      }}
      onEndReachedThreshold={0.2}
      renderItem={({ item }) => (
        <View style={{ gap: 4 }}>
          <Text>{item.authorName}</Text>
          <Text>{item.body}</Text>
        </View>
      )}
    />
  );
}
