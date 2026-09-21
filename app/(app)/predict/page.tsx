import { EpisodeStatus } from "@prisma/client";

import { auth } from "@/auth";
import { PredictionForm } from "@/components/predictions/prediction-form";
import {
  getActiveCouples,
  getEpisodeLockAt,
  getPredictableEpisode,
  getUserPredictions,
} from "@/lib/predictions";
import { SEASON_FINALE_EPISODE } from "@/lib/season-scoring";

export default async function PredictPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  const episode = await getPredictableEpisode();
  if (!episode) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Season winner
        </h1>
        <p className="mt-3 text-sm text-muted">
          No upcoming episode is open for predictions right now.
        </p>
      </div>
    );
  }

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
      lockAtIso={getEpisodeLockAt(episode).toISOString()}
      forceLocked={episode.status !== EpisodeStatus.UPCOMING}
      couples={couples}
      initial={{
        seasonWinnerCoupleId: initial.seasonWinnerCoupleId,
        seasonWinnerFromEpisodeNumber: initial.seasonWinnerFromEpisodeNumber,
      }}
    />
  );
}
