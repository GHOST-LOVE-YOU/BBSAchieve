import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY_PREFIX = "board_favorites_";

function getStorageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function useBoardFavorites(userId: string | null) {
  const [boardIds, setBoardIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const requestVersionRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    let active = true;
    mountedRef.current = true;
    requestVersionRef.current += 1;
    const requestVersion = requestVersionRef.current;
    const isActive = () => active && requestVersionRef.current === requestVersion;

    const load = async () => {
      if (!userId) {
        if (!isActive()) return;
        setBoardIds([]);
        setLoaded(true);
        return;
      }

      if (!isActive()) return;
      setLoaded(false);

      const raw = await AsyncStorage.getItem(getStorageKey(userId));
      if (!isActive()) return;

      if (raw) {
        try {
          setBoardIds(JSON.parse(raw) as string[]);
        } catch {
          setBoardIds([]);
        }
      } else {
        setBoardIds([]);
      }
      setLoaded(true);
    };

    void load();

    return () => {
      active = false;
      mountedRef.current = false;
    };
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
      if (!mountedRef.current) return;
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
