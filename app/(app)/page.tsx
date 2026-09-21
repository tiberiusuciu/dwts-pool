import { EpisodeStatus } from "@prisma/client";

import { auth } from "@/auth";
import { EpisodeTimeline } from "@/components/episodes/episode-timeline";
import { RankPredictionBoard } from "@/components/predictions/rank-prediction-board";
import { getEpisodesWithResults } from "@/lib/episodes";
import {
  defaultRankOrder,
  getActiveCouples,
  getEpisodeLockAt,
  getPredictableEpisode,
  getUserPredictions,
} from "@/lib/predictions";

export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.id;

  const [episodes, upcoming, couples] = await Promise.all([
    getEpisodesWithResults(),
    getPredictableEpisode(),
    getActiveCouples(),
  ]);

  const name = session?.user?.displayName ?? "there";
  const predictions =
    userId && upcoming
      ? await getUserPredictions(userId, upcoming.id)
      : null;

  const rankOrder =
    predictions && Object.keys(predictions.ranks).length === couples.length
      ? [...couples]
          .sort(
            (a, b) =>
              (predictions.ranks[a.id] ?? 999) -
              (predictions.ranks[b.id] ?? 999),
          )
          .map((c) => c.id)
      : defaultRankOrder(couples);

  return (
    <div>
      <p className="font-display text-sm font-medium uppercase tracking-[0.14em] text-accent">
        DWTS Pool
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
        Hey, {name}
      </h1>
      <p className="mt-3 max-w-md text-muted">
        Season 35 — rank next week&apos;s scoreboard and pick the elim before Tue
        8pm ET.
      </p>

      {upcoming && userId ? (
        <RankPredictionBoard
          episodeId={upcoming.id}
          episodeTitle={upcoming.title}
          episodeNumber={upcoming.episodeNumber}
          lockAtIso={getEpisodeLockAt(upcoming).toISOString()}
          forceLocked={upcoming.status !== EpisodeStatus.UPCOMING}
          couples={couples}
          initialOrder={rankOrder}
          initialEliminatedCoupleId={predictions?.eliminatedCoupleId ?? null}
        />
      ) : null}

      <EpisodeTimeline episodes={episodes} />
    </div>
  );
}
