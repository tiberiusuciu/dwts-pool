import { auth } from "@/auth";
import { SettingsClient } from "@/components/settings/settings-client";
import { prisma } from "@/lib/prisma";
import { getAllCouples } from "@/lib/predictions";

export default async function SettingsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const [couples, profile] = await Promise.all([
    getAllCouples(),
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: {
            displayName: true,
            rootingForCoupleId: true,
          },
        })
      : null,
  ]);

  return (
    <SettingsClient
      email={session?.user?.email ?? null}
      isAdmin={session?.user?.role === "ADMIN"}
      displayName={profile?.displayName ?? session?.user?.displayName ?? ""}
      rootingForCoupleId={profile?.rootingForCoupleId ?? null}
      couples={couples}
    />
  );
}
