import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { getThreadDetail } from "@bbs/state";
import { createReadingFlowDeps } from "@bbs/state/runtime";

type ThreadDetail = {
  id: string;
  title: string;
  body: string;
  authorName: string;
  publishedAt: string;
};

type ReplySummary = {
  id: string;
  body: string;
  authorName: string;
  publishedAt: string;
};

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
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [replies, setReplies] = useState<ReplySummary[]>([]);
  const [status, setStatus] = useState<"loading" | "notFound" | "error" | "success">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const threadIdValue = Array.isArray(threadId) ? threadId[0] : threadId;

  useEffect(() => {
    let active = true;

    if (!threadIdValue) {
      setThread(null);
      setReplies([]);
      setStatus("notFound");
      setErrorMessage(null);
      return () => {
        active = false;
      };
    }

    void getThreadDetail(threadIdValue, createReadingFlowDeps()).then((result) => {
      if (!active) {
        return;
      }

      if (result.status !== "success") {
        setThread(null);
        setReplies([]);
        setStatus(result.status);
        setErrorMessage(result.status === "error" ? result.message : null);
        return;
      }

      setThread(result.thread);
      setReplies(result.replies);
      setStatus("success");
      setErrorMessage(null);
    });

    return () => {
      active = false;
    };
  }, [threadIdValue]);

  if (status !== "success") {
    return (
      <View style={{ flex: 1, padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: "600" }}>帖子详情</Text>
        <Text>{getStatusText(status, errorMessage)}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: "600" }}>{thread?.title ?? "帖子详情"}</Text>
      {thread ? (
        <View style={{ gap: 8 }}>
          <Text>{thread.body}</Text>
          <Text>{thread.authorName}</Text>
        </View>
      ) : null}
      <View style={{ gap: 12 }}>
        {replies.map((reply) => (
          <View key={reply.id} style={{ gap: 4 }}>
            <Text>{reply.authorName}</Text>
            <Text>{reply.body}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
