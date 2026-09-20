import { auth } from "@/auth";
import { PredictionForm } from "@/components/predictions/prediction-form";
import {
  getActiveCouples,
  getPredictableEpisode,
  getUserPredictions,
  isEpisodeLocked,
} from "@/lib/predictions";

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
          Predictions
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
      episodeId={episode.id}
      episodeTitle={episode.title}
      episodeNumber={episode.episodeNumber}
      locked={isEpisodeLocked(episode)}
      couples={couples}
      initial={initial}
    />
  );
}
