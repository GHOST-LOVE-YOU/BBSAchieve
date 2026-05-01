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

export default function ThreadPage() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [replies, setReplies] = useState<ReplySummary[]>([]);

  useEffect(() => {
    let active = true;

    void getThreadDetail(threadId, createReadingFlowDeps()).then((result) => {
      if (!active || result.status !== "success") {
        return;
      }

      setThread(result.thread);
      setReplies(result.replies);
    });

    return () => {
      active = false;
    };
  }, [threadId]);

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
