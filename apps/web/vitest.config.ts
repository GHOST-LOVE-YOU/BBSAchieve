import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@bbs/domain": resolve(__dirname, "../../packages/domain/src/index.ts"),
      "@bbs/state": resolve(__dirname, "../../packages/state/src/index.ts"),
      "@bbs/test-utils": resolve(
        __dirname,
        "../../packages/test-utils/src/index.ts",
      ),
    },
  },
  test: {
    environment: "jsdom",
  },
});
