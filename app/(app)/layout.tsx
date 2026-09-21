import { EpisodeStatus } from "@prisma/client";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import {
  getEpisodeLockAt,
  getPredictableEpisode,
} from "@/lib/predictions";
import { getMyStanding } from "@/lib/scoring";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = session?.user?.id;

  const [standing, upcoming] = await Promise.all([
    userId ? getMyStanding(userId) : null,
    getPredictableEpisode(),
  ]);

  const lockClock = upcoming
    ? {
        lockAtIso: getEpisodeLockAt(upcoming).toISOString(),
        forceLocked: upcoming.status !== EpisodeStatus.UPCOMING,
      }
    : null;

  return (
    <AppShell standing={standing} lockClock={lockClock}>
      {children}
    </AppShell>
  );
}
