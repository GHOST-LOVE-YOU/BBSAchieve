import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY_PREFIX = "board_favorites_";

function getStorageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function useBoardFavorites(userId: string | null) {
  const [boardIds, setBoardIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) {
      setBoardIds([]);
      setLoaded(true);
      return;
    }
    void AsyncStorage.getItem(getStorageKey(userId)).then((raw: string | null) => {
      if (raw) {
        try {
          setBoardIds(JSON.parse(raw) as string[]);
        } catch {
          setBoardIds([]);
        }
      }
      setLoaded(true);
    });
  }, [userId]);

  const persist = useCallback(
    (ids: string[]) => {
      if (!userId) return;
      void AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(ids));
    },
    [userId],
  );

  const toggle = useCallback(
    (boardId: string) => {
      setBoardIds((prev) => {
        const next = prev.includes(boardId)
          ? prev.filter((id) => id !== boardId)
          : [...prev, boardId];
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const isFavorite = useCallback(
    (boardId: string) => boardIds.includes(boardId),
    [boardIds],
  );

  return { boardIds, toggle, isFavorite, loaded };
}
