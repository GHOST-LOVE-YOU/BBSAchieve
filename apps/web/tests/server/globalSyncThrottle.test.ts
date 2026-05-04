import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getGlobalSyncThrottleHolder,
  releaseGlobalSyncThrottle,
  tryAcquireGlobalSyncThrottle,
} from "@/src/server/syncThrottle/globalSyncThrottle";

function resetThrottleState() {
  const holder = getGlobalSyncThrottleHolder();
  if (holder) {
    releaseGlobalSyncThrottle(holder.ownerKey);
  }
}

describe("globalSyncThrottle", () => {
  beforeEach(() => {
    resetThrottleState();
  });

  afterEach(() => {
    resetThrottleState();
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

  it("does not let acquire result mutation corrupt stored holder state", () => {
    const acquired = tryAcquireGlobalSyncThrottle({
      ownerKey: "manual:JobInfo",
      triggerSource: "manual",
    });

    expect(acquired.acquired).toBe(true);

    if (!acquired.acquired) {
      throw new Error("expected throttle acquisition to succeed");
    }

    acquired.holder.ownerKey = "mutated:Owner";
    acquired.holder.triggerSource = "scheduled";
    acquired.holder.acquiredAt = new Date("2026-05-04T00:00:00.000Z");

    expect(getGlobalSyncThrottleHolder()).toMatchObject({
      ownerKey: "manual:JobInfo",
      triggerSource: "manual",
    });
  });

  it("does not let getter result mutation corrupt stored holder state", () => {
    tryAcquireGlobalSyncThrottle({
      ownerKey: "manual:JobInfo",
      triggerSource: "manual",
    });

    const holder = getGlobalSyncThrottleHolder();

    expect(holder).toMatchObject({
      ownerKey: "manual:JobInfo",
      triggerSource: "manual",
    });

    if (!holder) {
      throw new Error("expected current throttle holder");
    }

    holder.ownerKey = "mutated:Owner";
    holder.triggerSource = "scheduled";
    holder.acquiredAt = new Date("2026-05-04T00:00:00.000Z");

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
