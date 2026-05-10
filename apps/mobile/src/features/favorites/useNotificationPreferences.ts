import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY_PREFIX = "notification_prefs_";

export type ChannelState = {
  on: boolean;
  target: string;
  verified: boolean;
};

export type NotificationChannels = {
  telegram: ChannelState;
  email: ChannelState;
  browser: ChannelState;
};

export type EventRouting = {
  replies: Record<string, boolean>;
  mentions: Record<string, boolean>;
  system: Record<string, boolean>;
  digest: Record<string, boolean>;
};

export type NotificationPrefs = {
  replies: boolean;
  mentions: boolean;
  system: boolean;
  digest: boolean;
  weekend: boolean;
};

type StoredPreferences = {
  channels: NotificationChannels;
  routing: EventRouting;
  prefs: NotificationPrefs;
  primaryChannel: string;
};

const DEFAULT_PREFS: StoredPreferences = {
  channels: {
    telegram: { on: false, target: "未连接", verified: false },
    email: { on: false, target: "未连接", verified: false },
    browser: { on: false, target: "未授权", verified: false },
  },
  routing: {
    replies: { telegram: true, email: true, browser: true },
    mentions: { telegram: true, email: false, browser: true },
    system: { telegram: false, email: true, browser: false },
    digest: { telegram: false, email: true, browser: false },
  },
  prefs: {
    replies: true,
    mentions: true,
    system: false,
    digest: true,
    weekend: false,
  },
  primaryChannel: "telegram",
};

function getStorageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function useNotificationPreferences(userId: string | null) {
  const [state, setState] = useState<StoredPreferences>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userId) {
      setState(DEFAULT_PREFS);
      setLoaded(true);
      return;
    }
    void AsyncStorage.getItem(getStorageKey(userId)).then((raw: string | null) => {
      if (raw) {
        try {
          setState({ ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<StoredPreferences>) });
        } catch {
          setState(DEFAULT_PREFS);
        }
      }
      setLoaded(true);
    });
  }, [userId]);

  const persist = useCallback(
    (next: StoredPreferences) => {
      if (!userId) return;
      void AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(next));
    },
    [userId],
  );

  const update = useCallback(
    (partial: Partial<StoredPreferences>) => {
      setState((prev) => {
        const next = { ...prev, ...partial };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return { ...state, update, loaded };
}
