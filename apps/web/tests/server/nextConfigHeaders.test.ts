import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("Next.js response headers", () => {
  it("marks protected thread surfaces as non-cacheable", async () => {
    await expect(nextConfig.headers?.()).resolves.toEqual(
      expect.arrayContaining([
        {
          source: "/threads/:path*",
          headers: expect.arrayContaining([
            {
              key: "Cache-Control",
              value: "private, no-store, no-cache, max-age=0, must-revalidate",
            },
          ]),
        },
        {
          source: "/api/public/threads/:path*",
          headers: expect.arrayContaining([
            {
              key: "Cache-Control",
              value: "private, no-store, no-cache, max-age=0, must-revalidate",
            },
          ]),
        },
      ]),
    );
  });
});
