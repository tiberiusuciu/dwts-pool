import { EpisodeStatus } from "@prisma/client";

import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";
import { getPrizePoolCents } from "@/lib/app-settings";
import {
  getEpisodeLockAt,
  getFeaturedPredictionEpisode,
} from "@/lib/predictions";
import { getMyStanding } from "@/lib/scoring";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = session?.user?.id;

  const [standing, featured, prizePoolCents] = await Promise.all([
    userId ? getMyStanding(userId) : null,
    getFeaturedPredictionEpisode(),
    getPrizePoolCents(),
  ]);

  const lockClock = featured
    ? {
        lockAtIso: getEpisodeLockAt(featured).toISOString(),
        forceLocked: featured.status !== EpisodeStatus.UPCOMING,
      }
    : null;

  return (
    <AppShell
      standing={standing}
      lockClock={lockClock}
      prizePoolCents={prizePoolCents}
      liveParty={featured?.status === EpisodeStatus.LIVE}
      projectedStanding={featured?.status === EpisodeStatus.LIVE}
    >
      {children}
    </AppShell>
  );
}
