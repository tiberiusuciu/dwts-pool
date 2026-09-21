import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { getMyStanding } from "@/lib/scoring";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  const standing = userId ? await getMyStanding(userId) : null;

  return <AppShell standing={standing}>{children}</AppShell>;
}
