import { CookieJar } from "tough-cookie";
import { z } from "zod";
import {
  articleSchema,
  boardSchema,
  SourceError,
  type Observed,
  type SourceClient,
} from "./types";

const ORIGIN = "https://bbs.byr.cn";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export class ByrMobileClient implements SourceClient {
  stats = { requests: 0, cacheHits: 0 };
  private jar = new CookieJar();
  private session: Promise<void> | null = null;
  private cache = new Map<
    string,
    { expires: number; value: Observed<unknown> }
  >();
  private queue: Promise<unknown> = Promise.resolve();
  private lastRequest = 0;
  constructor(
    private credentials: { username: string; password: string },
    private transport: typeof fetch = fetch,
    private intervalMs = 800,
  ) {}

  private async network(path: string, init: RequestInit = {}) {
    const execute = async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        await sleep(
          Math.max(0, this.lastRequest + this.intervalMs - Date.now()),
        );
        this.lastRequest = Date.now();
        this.stats.requests++;
        let response: Response;
        try {
          response = await this.transport(ORIGIN + path, {
            ...init,
            redirect: "manual",
            cache: "no-store",
            signal: AbortSignal.timeout(20_000),
            headers: {
              "User-Agent": "Mozilla/5.0",
              Referer: ORIGIN + "/n/login",
              "X-Requested-With": "XMLHttpRequest",
              Cookie: await this.jar.getCookieString(ORIGIN),
              ...init.headers,
            },
          });
        } catch {
          if (attempt === 2)
            throw new SourceError("network", "源站连接失败或超时，请稍后重试");
          await sleep(1000 * (attempt + 1));
          continue;
        }
        for (const cookie of response.headers.getSetCookie())
          await this.jar.setCookie(cookie, ORIGIN);
        if (response.status === 429 || response.status >= 500) {
          await response.body?.cancel();
          if (attempt === 2)
            throw new SourceError(
              response.status === 429 ? "rate_limit" : "network",
              "源站限流或暂时不可用",
            );
          const seconds =
            Number(response.headers.get("retry-after")) || (attempt + 1) * 2;
          await sleep(Math.min(30, Math.max(1, seconds)) * 1000);
          continue;
        }
        return response;
      }
      throw new SourceError("network", "源站请求失败");
    };
    const result = this.queue.then(execute, execute);
    this.queue = result.catch(() => undefined);
    return result;
  }
  private async login() {
    if (!this.session) {
      this.session = (async () => {
        if (!this.credentials.username || !this.credentials.password)
          throw new SourceError("auth", "尚未配置源站账号");
        const response = await this.network("/n/b/auth/login.json", {
          method: "POST",
          body: new URLSearchParams(this.credentials),
        });
        const json = await response.json().catch(() => null);
        if (!response.ok || json?.success !== true)
          throw new SourceError("auth", "源站登录失败，请检查账号或稍后重试");
      })().catch((error) => {
        this.session = null;
        throw error;
      });
    }
    await this.session;
  }
  private async read<T>(
    path: string,
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  ): Promise<Observed<T>> {
    const cached = this.cache.get(path);
    if (cached && cached.expires > Date.now()) {
      this.stats.cacheHits++;
      return cached.value as Observed<T>;
    }
    await this.login();
    for (let authAttempt = 0; authAttempt < 2; authAttempt++) {
      const response = await this.network(path);
      const text = await response.text();
      let json: {
        success?: boolean;
        data?: unknown;
        msg?: string;
        message?: string;
      } | null = null;
      try {
        json = JSON.parse(text);
      } catch {
        /* 提示页可能不是 JSON。 */
      }
      const message = String(json?.msg ?? json?.message ?? "");
      const authFailure =
        response.status === 401 ||
        response.status === 403 ||
        (response.status >= 300 && response.status < 400) ||
        /登录|login/i.test(message);
      if (authFailure) {
        if (authAttempt === 0) {
          this.session = null;
          await this.login();
          continue;
        }
        throw new SourceError("auth", "源站会话失效，请重新检查登录状态");
      }
      if (
        response.status === 404 ||
        /文章不存在|主题不存在|文章已被删除/.test(message) ||
        (!json && /文章不存在|主题不存在|文章已被删除/.test(text))
      )
        throw new SourceError("missing", "源站帖子已不存在");
      if (!response.ok || json?.success !== true)
        throw new SourceError("format", "源站没有返回可识别的数据");
      const parsed = schema.safeParse(json.data);
      if (!parsed.success)
        throw new SourceError("format", "源站数据结构发生变化");
      const value = { data: parsed.data, observedAt: new Date() };
      if (this.cache.size >= 200)
        this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(path, { expires: Date.now() + 20_000, value });
      return value;
    }
    throw new SourceError("auth", "源站会话失效");
  }
  board(name: string, page: number) {
    return this.read(
      `/n/b/board/${encodeURIComponent(name)}.json?page=${page}`,
      boardSchema,
    );
  }
  article(name: string, id: string, page: number) {
    return this.read(
      `/n/b/article/${encodeURIComponent(name)}/${encodeURIComponent(id)}.json?page=${page}`,
      articleSchema,
    );
  }
}
