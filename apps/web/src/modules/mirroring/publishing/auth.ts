import { timingSafeEqual } from "node:crypto";
export function authorizedBotRequest(request: Request) {
  const expected = process.env.BOT_PUBLISH_TOKEN;
  const actual = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!expected || expected.length < 32 || !actual) return false;
  const a = Buffer.from(actual),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
