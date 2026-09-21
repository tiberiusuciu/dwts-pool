import {
  CoupleStatus,
  EpisodeStatus,
  PredictionKind,
  type ActualResult,
  type Episode,
  type Prediction,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  resolveScoringRuleset,
  scoreRankDistanceLegacy,
  scoreRankPoints,
} from "@/lib/scoring-rules";
import { scoreSeasonWinnerPoints } from "@/lib/season-scoring";

export {
  scoreSeasonWinnerPoints,
  seasonWinnerWeeksHeld,
  SEASON_WINNER_BASE,
  SEASON_WINNER_PER_WEEK,
} from "@/lib/season-scoring";

export {
  resolveScoringRuleset,
  scoreRankPoints,
  SCORING_RULESETS,
} from "@/lib/scoring-rules";

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

export type EpisodeScoreBreakdown = {
  episodeId: string;
  episodeNumber: number;
  title: string;
  elimPts: number;
  rankPts: number;
  seasonPts: number;
  total: number;
  eliminatedCoupleId: string | null;
  predictedElimName: string | null;
  actualEliminatedIds: string[];
  actualElimNames: string[];
  ranks: {
    coupleId: string;
    celebrityName: string;
    predictedRank: number | null;
    actualRank: number | null;
    points: number;
  }[];
};

function buildActualRanks(
  results: Pick<ActualResult, "coupleId" | "judgeScore">[],
  couples: { id: string; celebrityName: string }[],
): Map<string, number> {
  const name = new Map(couples.map((c) => [c.id, c.celebrityName]));
  const scored = results
    .filter((r) => r.judgeScore != null)
    .sort((a, b) => {
      const scoreDiff = (b.judgeScore ?? 0) - (a.judgeScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (name.get(a.coupleId) ?? "").localeCompare(
        name.get(b.coupleId) ?? "",
      );
    });
  const ranks = new Map<string, number>();
  scored.forEach((r, i) => ranks.set(r.coupleId, i + 1));
  return ranks;
}

export function scoreEpisodeFromData(input: {
  episode: Pick<Episode, "id" | "episodeNumber" | "title" | "isFinale">;
  results: Pick<ActualResult, "coupleId" | "judgeScore" | "isEliminated">[];
  predictions: Pick<
    Prediction,
    | "kind"
    | "seasonWinnerCoupleId"
    | "seasonWinnerFromEpisodeNumber"
    | "predictedEliminatedCoupleId"
    | "coupleId"
    | "predictedRank"
  >[];
  couples: { id: string; celebrityName: string }[];
  activeWinnerCoupleId: string | null;
}): EpisodeScoreBreakdown {
  const { episode, results, predictions, couples, activeWinnerCoupleId } =
    input;
  const coupleName = new Map(couples.map((c) => [c.id, c.celebrityName]));
  const ruleset = resolveScoringRuleset(episode.episodeNumber);

  const elimPred = predictions.find(
    (p) => p.kind === PredictionKind.WEEKLY_ELIMINATION,
  );
  const eliminatedCoupleId = elimPred?.predictedEliminatedCoupleId ?? null;
  const actualEliminatedIds = results
    .filter((r) => r.isEliminated)
    .map((r) => r.coupleId);

  const elimPts =
    eliminatedCoupleId && actualEliminatedIds.includes(eliminatedCoupleId)
      ? ruleset.elimPoints
      : 0;

  const actualRanks = buildActualRanks(results, couples);
  const n = actualRanks.size;

  const predictedRanks = new Map(
    predictions
      .filter(
        (p) =>
          p.kind === PredictionKind.WEEKLY_RANK &&
          p.coupleId &&
          p.predictedRank != null,
      )
      .map((p) => [p.coupleId!, p.predictedRank!] as const),
  );

  let rankPts = 0;
  const ranks = [...actualRanks.entries()]
    .map(([coupleId, actualRank]) => {
      const predictedRank = predictedRanks.get(coupleId) ?? null;
      const points =
        predictedRank != null && n > 0
          ? scoreRankPoints(predictedRank, actualRank, n, ruleset)
          : 0;
      rankPts += points;
      return {
        coupleId,
        celebrityName: coupleName.get(coupleId) ?? "Couple",
        predictedRank,
        actualRank,
        points,
      };
    })
    .sort((a, b) => (a.actualRank ?? 99) - (b.actualRank ?? 99));

  let seasonPts = 0;
  if (episode.isFinale && activeWinnerCoupleId) {
    const seasonPred = predictions.find(
      (p) => p.kind === PredictionKind.SEASON_WINNER,
    );
    if (seasonPred?.seasonWinnerCoupleId === activeWinnerCoupleId) {
      seasonPts = scoreSeasonWinnerPoints(
        seasonPred.seasonWinnerFromEpisodeNumber,
        episode.episodeNumber,
      );
    }
  }

  return {
    episodeId: episode.id,
    episodeNumber: episode.episodeNumber,
    title: episode.title,
    elimPts,
    rankPts,
    seasonPts,
    total: elimPts + rankPts + seasonPts,
    eliminatedCoupleId,
    predictedElimName: eliminatedCoupleId
      ? (coupleName.get(eliminatedCoupleId) ?? "Unknown")
      : null,
    actualEliminatedIds,
    actualElimNames: actualEliminatedIds.map(
      (id) => coupleName.get(id) ?? "Unknown",
    ),
    ranks,
  };
}

export async function getSeasonWinnerCoupleId(): Promise<string | null> {
  const active = await prisma.couple.findMany({
    where: { status: CoupleStatus.ACTIVE },
    select: { id: true },
  });
  return active.length === 1 ? active[0].id : null;
}

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
