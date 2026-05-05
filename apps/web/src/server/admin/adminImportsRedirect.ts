export async function readRedirectTo(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (
    !contentType.includes("application/x-www-form-urlencoded") &&
    !contentType.includes("multipart/form-data")
  ) {
    return null;
  }

  const formData = await request.formData();
  const redirectTo = formData.get("redirectTo");

  if (typeof redirectTo !== "string" || redirectTo.length === 0) {
    return null;
  }

  return redirectTo.startsWith("/") ? redirectTo : null;
}

export function buildAdminImportsRedirectUrl(
  redirectTo: string,
  input: {
    action: string;
    status: string;
    jobId?: string | null;
    message?: string | null;
  },
) {
  const url = new URL(redirectTo, "http://localhost");
  url.searchParams.set("action", input.action);
  url.searchParams.set("status", input.status);
  if (input.jobId) {
    url.searchParams.set("jobId", input.jobId);
  }
  if (input.message) {
    url.searchParams.set("message", input.message);
  }
  return `${url.pathname}${url.search}`;
}
