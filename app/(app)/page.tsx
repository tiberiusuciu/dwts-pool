import { EpisodeStatus } from "@prisma/client";

import { auth } from "@/auth";
import { EpisodeTimeline } from "@/components/episodes/episode-timeline";
import { HomeGreeting } from "@/components/home/home-greeting";
import { RaceChart } from "@/components/leaderboard/race-chart";
import { RankPredictionBoard } from "@/components/predictions/rank-prediction-board";
import { getEpisodesWithResults } from "@/lib/episodes";
import {
  defaultRankOrder,
  getActiveCouples,
  getEpisodeLockAt,
  getFeaturedPredictionEpisode,
  getUserPredictions,
} from "@/lib/predictions";
import { getLiveEpisodeRaceIfAny } from "@/lib/race-snapshots";

export default async function HomePage() {
  const session = await auth();
  const userId = session?.user?.id;

  const [episodes, featured, couples, liveRace] = await Promise.all([
    getEpisodesWithResults(),
    getFeaturedPredictionEpisode(),
    getActiveCouples(),
    getLiveEpisodeRaceIfAny(),
  ]);

  const isLive = featured?.status === EpisodeStatus.LIVE;
  const predictions =
    userId && featured
      ? await getUserPredictions(userId, featured.id)
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
    <div className="space-y-8">
      <HomeGreeting
        displayName={session?.user?.displayName}
        isLive={Boolean(isLive)}
      />

      {liveRace ? <RaceChart data={liveRace} live /> : null}

      {featured && userId ? (
        <RankPredictionBoard
          episodeId={featured.id}
          episodeTitle={featured.title}
          episodeNumber={featured.episodeNumber}
          lockAtIso={getEpisodeLockAt(featured).toISOString()}
          forceLocked={featured.status !== EpisodeStatus.UPCOMING}
          episodeStatus={featured.status}
          couples={couples}
          initialOrder={rankOrder}
          initialEliminatedCoupleId={predictions?.eliminatedCoupleId ?? null}
        />
      ) : null}

      <EpisodeTimeline episodes={episodes} />
    </div>
  );
}
