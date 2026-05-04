type SyncThrottleHolder = {
  ownerKey: string;
  triggerSource: "manual" | "scheduled";
  acquiredAt: Date;
};

const globalForSyncThrottle = globalThis as typeof globalThis & {
  __bbsGlobalSyncThrottleHolder__?: SyncThrottleHolder | null;
};

function getHolder() {
  return globalForSyncThrottle.__bbsGlobalSyncThrottleHolder__ ?? null;
}

export function tryAcquireGlobalSyncThrottle(input: {
  ownerKey: string;
  triggerSource: "manual" | "scheduled";
}) {
  const existing = getHolder();
  if (existing) {
    return { acquired: false as const, holder: existing };
  }

  const holder: SyncThrottleHolder = {
    ownerKey: input.ownerKey,
    triggerSource: input.triggerSource,
    acquiredAt: new Date(),
  };
  globalForSyncThrottle.__bbsGlobalSyncThrottleHolder__ = holder;

  return { acquired: true as const, holder };
}

export function releaseGlobalSyncThrottle(ownerKey: string) {
  const existing = getHolder();
  if (existing?.ownerKey === ownerKey) {
    globalForSyncThrottle.__bbsGlobalSyncThrottleHolder__ = null;
  }
}

export function getGlobalSyncThrottleHolder() {
  return getHolder();
}
