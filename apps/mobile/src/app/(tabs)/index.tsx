import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Link } from "expo-router";

import { getBoardSummaries } from "@bbs/state";
import { createReadingFlowDeps } from "@bbs/state/runtime";

type BoardSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  threadCount: number;
  latestThreadTitle: string | null;
};

function getStatusText(message: string | null) {
  return message ? `读取失败：${message}` : "读取失败";
}

export default function HomeScreen() {
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void getBoardSummaries(createReadingFlowDeps()).then((result) => {
      if (!active) {
        return;
      }

      if (result.status !== "success") {
        setErrorMessage(result.message);
        return;
      }

      setBoards(result.boards);
      setErrorMessage(null);
    });

    return () => {
      active = false;
    };
  }, []);

  if (errorMessage) {
    return (
      <View style={{ flex: 1, padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: "600" }}>论坛首页</Text>
        <Text>{getStatusText(errorMessage)}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: "600" }}>论坛首页</Text>
      <View style={{ gap: 12 }}>
        {boards.map((board) => (
          <View key={board.id} style={{ gap: 6 }}>
            <Link
              href={{
                pathname: "/boards/[boardId]",
                params: { boardId: board.slug },
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: "500" }}>{board.name}</Text>
            </Link>
            <Text>{board.description}</Text>
            <Text>帖子数：{board.threadCount}</Text>
            {board.latestThreadTitle ? <Text>最新：{board.latestThreadTitle}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}
