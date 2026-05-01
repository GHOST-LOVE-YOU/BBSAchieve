import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";

import { getBoardDetail } from "@bbs/state";
import { createReadingFlowDeps } from "@bbs/state/runtime";

type BoardDetail = {
  id: string;
  slug: string;
  name: string;
  description: string;
};

type ThreadSummary = {
  id: string;
  title: string;
  authorName: string;
  publishedAt: string;
  replyCount: number;
};

export default function BoardPage() {
  const { boardId } = useLocalSearchParams<{ boardId: string }>();
  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);

  useEffect(() => {
    let active = true;

    void getBoardDetail(boardId, createReadingFlowDeps()).then((result) => {
      if (!active || result.status !== "success") {
        return;
      }

      setBoard(result.board);
      setThreads(result.threads);
    });

    return () => {
      active = false;
    };
  }, [boardId]);

  return (
    <View style={{ flex: 1, padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: "600" }}>{board?.name ?? "版面帖子"}</Text>
      {board ? <Text>{board.description}</Text> : null}
      <View style={{ gap: 12 }}>
        {threads.map((thread) => (
          <View key={thread.id} style={{ gap: 4 }}>
            <Link
              href={{
                pathname: "/threads/[threadId]",
                params: { threadId: thread.id },
              } as never}
            >
              <Text style={{ fontSize: 18, fontWeight: "500" }}>{thread.title}</Text>
            </Link>
            <Text>{thread.authorName}</Text>
            <Text>回复数：{thread.replyCount}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
