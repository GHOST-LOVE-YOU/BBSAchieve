import { NextRequest, NextResponse } from "next/server";

function privateResponse(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

function hiddenNotFound() {
  return privateResponse(new NextResponse("Not Found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  }));
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/api/internal/bots/actions") {
    const { authorizedBotRequest } = await import("./src/modules/mirroring/publishing/auth");
    return authorizedBotRequest(request) ? privateResponse(NextResponse.next()) : hiddenNotFound();
  }
  const { localDevelopmentHost } = await import("./src/modules/mirroring/dev/auth");
  if (localDevelopmentHost(request.headers.get("host")) && !pathname.startsWith("/api/auth/")) {
    return privateResponse(NextResponse.next());
  }
  // 只放行明确的登录入口和 OAuth 回调，不公开 SDK 的注册、setup 等入口。
  if (pathname === "/api/auth/login" || pathname === "/api/auth/kinde_callback") {
    return privateResponse(NextResponse.next());
  }
  if (pathname.startsWith("/api/auth/") && pathname !== "/api/auth/logout") {
    return hiddenNotFound();
  }

  try {
    // 移动端仍可用经过签名、issuer 和 audience 验证的 Bearer token 访问 API。
    if (pathname.startsWith("/api/public/")) {
      const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
      if (token) {
        const { verifyBearerToken } = await import("./src/server/auth/jwt");
        await verifyBearerToken(token);
        return privateResponse(NextResponse.next());
      }
    }

    // 没有登录凭据时直接结束，不加载页面、数据库或认证 SDK。
    if (!request.cookies.has("access_token") || !request.cookies.has("id_token")) {
      return hiddenNotFound();
    }
    const { withAuth } = await import("@kinde-oss/kinde-auth-nextjs/middleware");
    const response = await withAuth(request, {
      publicPaths: [],
      isReturnToCurrentPage: false,
    }) as NextResponse;
    // SDK 在会话失效时默认跳转登录；这里统一隐藏，不能泄露 Location。
    if (response.headers.has("Location") || response.status >= 300) {
      return hiddenNotFound();
    }
    return privateResponse(response);
  } catch {
    // 认证异常也保持关闭，不输出登录入口或认证配置。
    return hiddenNotFound();
  }
}

export const config = {
  matcher: ["/:path*"],
};
