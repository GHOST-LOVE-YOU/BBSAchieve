import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  testIgnore: "**/._*",
  timeout: 60_000,
  use: { baseURL: "http://127.0.0.1:3307", trace: "retain-on-failure" },
  webServer: {
    command: "pnpm exec next dev --webpack --hostname 127.0.0.1 --port 3307",
    url: "http://127.0.0.1:3307/admin/scheduled-tasks",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1050 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
