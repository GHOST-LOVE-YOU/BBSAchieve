import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
test("任务概况、展开、暂停、恢复与原子任务发布", async ({ page }, info) => {
  await page.goto("/admin/scheduled-tasks");
  await expect(
    page.getByRole("heading", { name: "采集与机器人发布" }),
  ).toBeVisible();
  const board = page
    .locator("section")
    .filter({
      has: page.getByRole("heading", { name: "悄悄话", exact: true }),
    });
  await board.getByRole("button", { name: "暂停版面" }).click();
  await expect(board.getByRole("button", { name: "继续运行" })).toBeVisible();
  await board.getByRole("button", { name: "继续运行" }).click();
  await expect(board.getByRole("button", { name: "暂停版面" })).toBeVisible();
  await board.getByRole("button", { name: "立即采集" }).click();
  await expect(board.getByText("等待采集", { exact: true })).toBeVisible();
  execFileSync("pnpm", ["mirror:tick"], {
    cwd: resolve(process.cwd(), "../.."),
    env: { ...process.env, NODE_ENV: "development" },
    stdio: "pipe",
  });
  execFileSync("pnpm", ["mirror:tick"], {
    cwd: resolve(process.cwd(), "../.."),
    env: { ...process.env, NODE_ENV: "development" },
    stdio: "pipe",
  });
  await page.getByRole("button", { name: "刷新状态" }).click();
  await expect(board.getByText("采集完成", { exact: true })).toBeVisible();
  await board.locator("summary").click();
  await expect(
    board.getByText("已发布", { exact: true }).first(),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("scheduled-tasks.png"),
    fullPage: true,
  });
});
test("个人中心退出入口位于账号设置区域", async ({ page }, info) => {
  await page.goto("/me");
  const account = page.getByRole("region", { name: "账号设置" });
  await account.scrollIntoViewIfNeeded();
  const logout = account.getByRole("link", { name: "退出登录" });
  await expect(logout).toBeVisible();
  await expect(logout).toHaveAttribute("href", "/api/auth/logout");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("profile.png"),
    fullPage: true,
  });
});
test("开发身份不能用于非本机 Host，发布接口无密钥返回 404", async ({
  request,
}) => {
  const response = await request.get("/api/internal/bots/actions");
  expect(response.status()).toBe(404);
  const anonymous = await request.get("/api/public/feed", {
    headers: { host: "example.invalid" },
    maxRedirects: 0,
  });
  expect(anonymous.status()).toBe(404);
  expect(anonymous.headers()["location"]).toBeUndefined();
});
