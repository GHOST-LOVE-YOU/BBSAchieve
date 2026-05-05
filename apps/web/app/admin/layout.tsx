import { requireAdminPageUser } from "@/src/server/auth/pageGuards";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAdminPageUser("/admin");

  return <>{children}</>;
}
