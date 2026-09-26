import {
  CoupleStatus,
  EpisodeStatus,
  PredictionKind,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  scoreEpisodeFromData,
  type EpisodeScoreBreakdown,
} from "@/lib/score-episode";
import { scoreRankDistanceLegacy } from "@/lib/scoring-rules";

export {
  scoreSeasonWinnerPoints,
  seasonWinnerWeeksHeld,
  SEASON_WINNER_BASE,
  SEASON_WINNER_PER_WEEK,
} from "@/lib/season-scoring";

export {
  buildActualRankRanges,
  distanceToRankRange,
  resolveScoringRuleset,
  scoreRankPoints,
  SCORING_RULESETS,
} from "@/lib/scoring-rules";

export {
  scoreEpisodeFromData,
  type EpisodeScoreBreakdown,
} from "@/lib/score-episode";

/** Legacy helper kept for callers that still need n-minus-distance math. */
export function scoreRankDistance(
  predictedRank: number,
  actualRank: number,
  n: number,
): number {
  return scoreRankDistanceLegacy(predictedRank, actualRank, n);
}

/** Episodes still "upcoming" are treated as not aired — do not award points. */
const SCORABLE_EPISODE_STATUSES = [EpisodeStatus.PAST, EpisodeStatus.LIVE] as const;

export async function getSeasonWinnerCoupleId(): Promise<string | null> {
  const active = await prisma.couple.findMany({
    where: { status: CoupleStatus.ACTIVE },
    select: { id: true },
  });
  return active.length === 1 ? active[0].id : null;
}

/**
 * Recompute every named user's `totalPoints` from existing predictions +
 * actual results. Read-only on Prediction / PredictionEvent — scoreboard only.
 */
export async function recalculateAllPoints(): Promise<
  { userId: string; totalPoints: number }[]
> {
  const [users, episodes, couples, activeWinnerCoupleId] = await Promise.all([
    prisma.user.findMany({
      where: { displayName: { not: null } },
      select: { id: true, displayName: true },
    }),
    prisma.episode.findMany({
      where: {
        status: { in: [...SCORABLE_EPISODE_STATUSES] },
        actualResults: { some: {} },
      },
      include: { actualResults: true },
      orderBy: { episodeNumber: "asc" },
    }),
    prisma.couple.findMany({ select: { id: true, celebrityName: true } }),
    getSeasonWinnerCoupleId(),
  ]);

  const allPredictions = await prisma.prediction.findMany({
    where: {
      userId: { in: users.map((u) => u.id) },
      kind: {
        in: [
          PredictionKind.SEASON_WINNER,
          PredictionKind.WEEKLY_ELIMINATION,
          PredictionKind.WEEKLY_RANK,
        ],
      },
    },
  });

  const predsByUser = new Map<string, typeof allPredictions>();
  for (const pred of allPredictions) {
    const list = predsByUser.get(pred.userId) ?? [];
    list.push(pred);
    predsByUser.set(pred.userId, list);
  }

  const updates: { userId: string; totalPoints: number }[] = [];

  for (const user of users) {
    const userPreds = predsByUser.get(user.id) ?? [];
    let totalPoints = 0;

    for (const episode of episodes) {
      const episodePreds = userPreds.filter(
        (p) =>
          p.kind === PredictionKind.SEASON_WINNER ||
          p.episodeId === episode.id,
      );
      const breakdown = scoreEpisodeFromData({
        episode,
        results: episode.actualResults,
        predictions: episodePreds,
        couples,
        activeWinnerCoupleId: episode.isFinale ? activeWinnerCoupleId : null,
      });
      totalPoints += breakdown.total;
    }

    updates.push({ userId: user.id, totalPoints });
  }

  await prisma.$transaction(
    updates.map((u) =>
      prisma.user.update({
        where: { id: u.userId },
        data: { totalPoints: u.totalPoints },
      }),
    ),
  );

  return updates;
}

export type LeaderboardEntry = {
  userId: string;
  displayName: string;
  totalPoints: number;
  rank: number;
  rootingFor: string | null;
  episodes: EpisodeScoreBreakdown[];
};

export async function getMyStanding(
  userId: string,
): Promise<{ rank: number; totalPoints: number } | null> {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, totalPoints: true, displayName: true },
  });
  if (!me?.displayName) return null;

  const users = await prisma.user.findMany({
    where: { displayName: { not: null } },
    select: { id: true, totalPoints: true },
    orderBy: [{ totalPoints: "desc" }, { displayName: "asc" }],
  });

  let lastPoints: number | null = null;
  let lastRank = 0;
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    if (user.totalPoints !== lastPoints) {
      lastRank = i + 1;
      lastPoints = user.totalPoints;
    }
    if (user.id === userId) {
      return { rank: lastRank, totalPoints: user.totalPoints };
    }
  }
  return { rank: users.length, totalPoints: me.totalPoints };
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const [users, episodes, couples, activeWinnerCoupleId] = await Promise.all([
    prisma.user.findMany({
      where: { displayName: { not: null } },
      select: {
        id: true,
        displayName: true,
        totalPoints: true,
        rootingForCouple: {
          select: { celebrityName: true, proName: true },
        },
      },
      orderBy: [{ totalPoints: "desc" }, { displayName: "asc" }],
    }),
    prisma.episode.findMany({
      where: {
        status: { in: [...SCORABLE_EPISODE_STATUSES] },
        actualResults: { some: {} },
      },
      include: { actualResults: true },
      orderBy: { episodeNumber: "asc" },
    }),
    prisma.couple.findMany({ select: { id: true, celebrityName: true } }),
    getSeasonWinnerCoupleId(),
  ]);

  const allPredictions = await prisma.prediction.findMany({
    where: {
      userId: { in: users.map((u) => u.id) },
      kind: {
        in: [
          PredictionKind.SEASON_WINNER,
          PredictionKind.WEEKLY_ELIMINATION,
          PredictionKind.WEEKLY_RANK,
        ],
      },
    },
  });

  const predsByUser = new Map<string, typeof allPredictions>();
  for (const pred of allPredictions) {
    const list = predsByUser.get(pred.userId) ?? [];
    list.push(pred);
    predsByUser.set(pred.userId, list);
  }

  let lastPoints: number | null = null;
  let lastRank = 0;

  return users.map((user, index) => {
    if (user.totalPoints !== lastPoints) {
      lastRank = index + 1;
      lastPoints = user.totalPoints;
    }

    const userPreds = predsByUser.get(user.id) ?? [];
    const episodeBreakdowns = episodes.map((episode) =>
      scoreEpisodeFromData({
        episode,
        results: episode.actualResults,
        predictions: userPreds.filter(
          (p) =>
            p.kind === PredictionKind.SEASON_WINNER ||
            p.episodeId === episode.id,
        ),
        couples,
        activeWinnerCoupleId: episode.isFinale ? activeWinnerCoupleId : null,
      }),
    );

    return {
      userId: user.id,
      displayName: user.displayName ?? "Player",
      totalPoints: user.totalPoints,
      rank: lastRank,
      rootingFor: user.rootingForCouple
        ? `${user.rootingForCouple.celebrityName} & ${user.rootingForCouple.proName}`
        : null,
      episodes: episodeBreakdowns,
    };
  });
}
