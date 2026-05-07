import { handleAuth } from "@kinde-oss/kinde-auth-nextjs/server";

export async function GET(request: Request, context: { params: Promise<{ kindeAuth: string }> }) {
  return handleAuth()(request, context);
}
