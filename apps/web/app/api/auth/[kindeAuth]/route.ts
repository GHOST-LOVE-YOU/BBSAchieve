export async function GET(request: Request, context: { params: Promise<{ kindeAuth: string }> }) {
  const { handleAuth } = await import("@kinde-oss/kinde-auth-nextjs/server");
  return handleAuth()(request, context);
}
