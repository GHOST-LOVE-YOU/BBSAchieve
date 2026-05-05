import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";

export default withAuth({
  isReturnToCurrentPage: true,
});

export const config = {
  matcher: ["/threads/:path*", "/admin/:path*"],
};
