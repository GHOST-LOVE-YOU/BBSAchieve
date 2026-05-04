import { FlatList, Text, View } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";

import { useBoardThreadsFeed } from "@/features/reading/useBoardThreadsFeed";

function getStatusText(status: "loading" | "notFound" | "error", message: string | null) {
  if (status === "notFound") {
    return "版面不存在";
  }

  if (status === "error") {
    return message ? `读取失败：${message}` : "读取失败";
  }

  return "加载中";
}

export default function BoardPage() {
  const { boardId } = useLocalSearchParams<{ boardId?: string | string[] }>();
  const boardIdValue = Array.isArray(boardId) ? boardId[0] : boardId;
  const {
    board,
    items,
    initialStatus,
    initialError,
    loadMoreError,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useBoardThreadsFeed(boardIdValue);

  if (initialStatus !== "success") {
    return (
      <View style={{ flex: 1, padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: "600" }}>版面帖子</Text>
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
          <Text style={{ fontSize: 28, fontWeight: "600" }}>{board?.name ?? "版面帖子"}</Text>
          {board ? <Text>{board.description}</Text> : null}
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
          <Link
            href={{
              pathname: "/threads/[threadId]",
              params: { threadId: item.id.replace(/^thread:/, "") },
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "500" }}>{item.title}</Text>
          </Link>
          <Text>{item.authorName}</Text>
          <Text>回复数：{item.replyCount}</Text>
        </View>
      )}
    />
  );
}
