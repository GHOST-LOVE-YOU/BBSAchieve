import { ByrMobileClient } from "./client";
import { FixtureSource } from "../dev/fixture";
import type { SourceClient } from "./types";
const state = globalThis as typeof globalThis & { mirrorSource?: SourceClient };
export function getSource(): SourceClient {
  if (!state.mirrorSource) {
    const fixture = process.env.MIRROR_SOURCE === "fixture";
    if (fixture && process.env.NODE_ENV === "production")
      throw new Error("生产环境禁止使用模拟源站");
    state.mirrorSource = fixture
      ? new FixtureSource()
      : new ByrMobileClient({
          username: process.env.BBS_USERNAME ?? "",
          password: process.env.BBS_PASSWORD ?? "",
        });
  }
  return state.mirrorSource;
}
