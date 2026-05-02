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
  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "notFound" | "error" | "success">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const boardIdValue = Array.isArray(boardId) ? boardId[0] : boardId;

  useEffect(() => {
    let active = true;

    if (!boardIdValue) {
      setBoard(null);
      setThreads([]);
      setStatus("notFound");
      setErrorMessage(null);
      return () => {
        active = false;
      };
    }

    void getBoardDetail(boardIdValue, createReadingFlowDeps()).then((result) => {
      if (!active) {
        return;
      }

      if (result.status !== "success") {
        setBoard(null);
        setThreads([]);
        setStatus(result.status);
        setErrorMessage(result.status === "error" ? result.message : null);
        return;
      }

      setBoard(result.board);
      setThreads(result.threads);
      setStatus("success");
      setErrorMessage(null);
    });

    return () => {
      active = false;
    };
  }, [boardIdValue]);

  if (status !== "success") {
    return (
      <View style={{ flex: 1, padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: "600" }}>版面帖子</Text>
        <Text>{getStatusText(status, errorMessage)}</Text>
      </View>
    );
  }

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
                params: { threadId: thread.id.replace(/^thread:/, "") },
              }}
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
