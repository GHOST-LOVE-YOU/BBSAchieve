// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
const mocks = vi.hoisted(() => ({ withAuth: vi.fn(), verifyBearerToken: vi.fn() }));
vi.mock("@kinde-oss/kinde-auth-nextjs/middleware", () => ({ withAuth: mocks.withAuth }));
vi.mock("../src/server/auth/jwt", () => ({ verifyBearerToken: mocks.verifyBearerToken }));
import { proxy } from "../proxy";

function request(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`https://example.test${path}`, { headers });
}
async function expectHidden(req: NextRequest) {
  const res = await proxy(req);
  expect(res.status).toBe(404);
  expect(res.headers.get("location")).toBeNull();
  expect(res.headers.get("cache-control")).toContain("no-store");
  expect(await res.text()).toBe("Not Found");
}
describe("private site boundary", () => {
  beforeEach(() => { vi.resetAllMocks(); });
  it.each(["/", "/threads/example", "/search", "/admin", "/api/public/feed", "/admin/api/imports/byr-sync", "/_next/static/example.js", "/favicon.ico", "/robots.txt", "/missing", "/?invitation_code=anything"])("hides anonymous %s", async path => {
    await expectHidden(request(path));
    expect(mocks.withAuth).not.toHaveBeenCalled();
  });
  it.each(["register", "setup", "health", "logout", "login/extra"])("does not expose auth %s", async path => {
    await expectHidden(request(`/api/auth/${path}`));
  });
  it.each(["login", "kinde_callback"])("allows explicit authentication %s", async path => {
    expect((await proxy(request(`/api/auth/${path}`))).headers.get("x-middleware-next")).toBe("1");
  });
  it("converts expired or forged-cookie redirects into a plain 404", async () => {
    mocks.withAuth.mockResolvedValue(NextResponse.redirect("https://example.test/api/auth/login"));
    await expectHidden(request("/", { cookie: "access_token=forged; id_token=forged" }));
  });
  it("fails closed on authentication errors", async () => {
    mocks.withAuth.mockRejectedValue(new Error("unavailable"));
    await expectHidden(request("/", { cookie: "access_token=a; id_token=b" }));
  });
  it("allows verified sessions and preserves refreshed cookies", async () => {
    const next = NextResponse.next(); next.cookies.set("access_token", "refreshed");
    mocks.withAuth.mockResolvedValue(next);
    const res = await proxy(request("/", { cookie: "access_token=a; id_token=b" }));
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(res.cookies.get("access_token")?.value).toBe("refreshed");
    expect(mocks.withAuth).toHaveBeenCalledWith(expect.anything(), { publicPaths: [], isReturnToCurrentPage: false });
  });
  it("allows a verified mobile token only for public API routes", async () => {
    mocks.verifyBearerToken.mockResolvedValue({ subject: "user" });
    expect((await proxy(request("/api/public/feed", { authorization: "Bearer valid" }))).status).toBe(200);
    await expectHidden(request("/", { authorization: "Bearer valid" }));
  });
  it("rejects an invalid mobile token", async () => {
    mocks.verifyBearerToken.mockRejectedValue(new Error("bad signature"));
    await expectHidden(request("/api/public/feed", { authorization: "Bearer forged" }));
  });
});
