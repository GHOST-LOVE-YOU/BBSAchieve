import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getGlobalSyncThrottleHolder,
  releaseGlobalSyncThrottle,
  tryAcquireGlobalSyncThrottle,
} from "@/src/server/syncThrottle/globalSyncThrottle";

describe("globalSyncThrottle", () => {
  beforeEach(() => {
    releaseGlobalSyncThrottle("manual:JobInfo");
    releaseGlobalSyncThrottle("scheduled:JobInfo");
  });

  afterEach(() => {
    releaseGlobalSyncThrottle("manual:JobInfo");
    releaseGlobalSyncThrottle("scheduled:JobInfo");
  });

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

  it("returns the current holder after acquire", () => {
    const acquired = tryAcquireGlobalSyncThrottle({
      ownerKey: "manual:JobInfo",
      triggerSource: "manual",
    });

    expect(acquired.acquired).toBe(true);
    expect(getGlobalSyncThrottleHolder()).toMatchObject({
      ownerKey: "manual:JobInfo",
      triggerSource: "manual",
    });
  });

  it("does not clear the holder when release ownerKey does not match", () => {
    tryAcquireGlobalSyncThrottle({
      ownerKey: "manual:JobInfo",
      triggerSource: "manual",
    });

    releaseGlobalSyncThrottle("scheduled:JobInfo");

    expect(getGlobalSyncThrottleHolder()).toMatchObject({
      ownerKey: "manual:JobInfo",
      triggerSource: "manual",
    });
  });

  it("clears the holder when release ownerKey matches", () => {
    tryAcquireGlobalSyncThrottle({
      ownerKey: "manual:JobInfo",
      triggerSource: "manual",
    });

    releaseGlobalSyncThrottle("manual:JobInfo");

    expect(getGlobalSyncThrottleHolder()).toBeNull();
  });
});
