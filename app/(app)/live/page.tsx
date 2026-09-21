import Link from "next/link";

import { auth } from "@/auth";
import { PredictionBreakdown } from "@/components/live/prediction-breakdown";
import { PredictionForm } from "@/components/predictions/prediction-form";
import {
  getBreakdownForEpisode,
  resolveFocusEpisodeId,
} from "@/lib/live-breakdown";
import {
  getActiveCouples,
  getUserPredictions,
  isEpisodeLocked,
} from "@/lib/predictions";
import { prisma } from "@/lib/prisma";
import { SEASON_FINALE_EPISODE } from "@/lib/season-scoring";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const session = await auth();
  const userId = session?.user?.id;
  const episodeId = await resolveFocusEpisodeId();

  if (!episodeId || !userId) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Episode board
        </h1>
        <p className="mt-3 text-sm text-muted">
          No episode is open yet. Check back when the next show is scheduled.
        </p>
      </div>
    );
  }

  const episode = await prisma.episode.findUnique({ where: { id: episodeId } });
  if (!episode) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Episode board
        </h1>
        <p className="mt-3 text-sm text-muted">Could not load episode data.</p>
      </div>
    );
  }

  if (episode.status === "UPCOMING") {
    return (
      <div className="space-y-4">
        <p className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-muted">
          Prediction mode — set your{" "}
          <Link href="/" className="font-medium text-accent hover:underline">
            score ranking on Home
          </Link>
          , then season winner below. Locks Tue 8pm ET.
        </p>
        <PredictSection episodeId={episode.id} userId={userId} />
      </div>
    );
  }

  const breakdown = await getBreakdownForEpisode(episodeId);
  if (!breakdown) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Episode board
        </h1>
        <p className="mt-3 text-sm text-muted">Could not load episode data.</p>
      </div>
    );
  }

  return <PredictionBreakdown initial={breakdown} />;
}

async function PredictSection({
  episodeId,
  userId,
}: {
  episodeId: string;
  userId: string;
}) {
  const episode = await prisma.episode.findUniqueOrThrow({
    where: { id: episodeId },
  });
  const [couples, initial] = await Promise.all([
    getActiveCouples(),
    getUserPredictions(userId, episode.id),
  ]);

  return (
    <PredictionForm
      key={`${initial.seasonWinnerCoupleId}-${initial.seasonWinnerFromEpisodeNumber}`}
      episodeId={episode.id}
      episodeTitle={episode.title}
      episodeNumber={episode.episodeNumber}
      finaleEpisodeNumber={SEASON_FINALE_EPISODE}
      locked={isEpisodeLocked(episode)}
      couples={couples}
      initial={{
        seasonWinnerCoupleId: initial.seasonWinnerCoupleId,
        seasonWinnerFromEpisodeNumber: initial.seasonWinnerFromEpisodeNumber,
      }}
    />
  );
}
