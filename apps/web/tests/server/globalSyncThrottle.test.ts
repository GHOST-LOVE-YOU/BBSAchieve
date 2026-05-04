import { describe, expect, it } from "vitest";

import {
  releaseGlobalSyncThrottle,
  tryAcquireGlobalSyncThrottle,
} from "@/src/server/syncThrottle/globalSyncThrottle";

describe("globalSyncThrottle", () => {
  it("allows only one active holder at a time", () => {
    const first = tryAcquireGlobalSyncThrottle({
      ownerKey: "manual:JobInfo",
      triggerSource: "manual",
    });
    const second = tryAcquireGlobalSyncThrottle({
      ownerKey: "scheduled:JobInfo",
      triggerSource: "scheduled",
    });

    expect(first.acquired).toBe(true);
    expect(second).toMatchObject({
      acquired: false,
      holder: {
        ownerKey: "manual:JobInfo",
        triggerSource: "manual",
      },
    });

    releaseGlobalSyncThrottle("manual:JobInfo");
  });
});
