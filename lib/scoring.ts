import {
  CoupleStatus,
  PredictionKind,
  type ActualResult,
  type Episode,
  type Prediction,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const ELIM_POINTS = 50;
export const SEASON_WINNER_POINTS = 200;

const PROXIMITY: Record<number, number> = {
  0: 20,
  1: 10,
  2: 5,
  3: 2,
  4: 1,
};

export function scoreProximity(predicted: number, actual: number): number {
  const delta = Math.abs(Math.round(predicted) - Math.round(actual));
  return PROXIMITY[delta] ?? 0;
}

export type EpisodeScoreBreakdown = {
  episodeId: string;
  episodeNumber: number;
  title: string;
  elimPts: number;
  scorePts: number;
  seasonPts: number;
  total: number;
  eliminatedCoupleId: string | null;
  actualEliminatedIds: string[];
  scores: {
    coupleId: string;
    celebrityName: string;
    predicted: number | null;
    actual: number | null;
    points: number;
  }[];
};

export function scoreEpisodeFromData(input: {
  episode: Pick<Episode, "id" | "episodeNumber" | "title" | "isFinale">;
  results: Pick<ActualResult, "coupleId" | "judgeScore" | "isEliminated">[];
  predictions: Pick<
    Prediction,
    | "kind"
    | "seasonWinnerCoupleId"
    | "predictedEliminatedCoupleId"
    | "coupleId"
    | "predictedScore"
  >[];
  couples: { id: string; celebrityName: string }[];
  activeWinnerCoupleId: string | null;
}): EpisodeScoreBreakdown {
  const { episode, results, predictions, couples, activeWinnerCoupleId } = input;
  const coupleName = new Map(couples.map((c) => [c.id, c.celebrityName]));

  const elimPred = predictions.find(
    (p) => p.kind === PredictionKind.WEEKLY_ELIMINATION,
  );
  const eliminatedCoupleId = elimPred?.predictedEliminatedCoupleId ?? null;
  const actualEliminatedIds = results
    .filter((r) => r.isEliminated)
    .map((r) => r.coupleId);

  const elimPts =
    eliminatedCoupleId && actualEliminatedIds.includes(eliminatedCoupleId)
      ? ELIM_POINTS
      : 0;

  const scorePredByCouple = new Map(
    predictions
      .filter((p) => p.kind === PredictionKind.WEEKLY_SCORE && p.coupleId)
      .map((p) => [p.coupleId!, p.predictedScore ?? null] as const),
  );

  let scorePts = 0;
  const scores = results
    .filter((r) => r.judgeScore != null)
    .map((r) => {
      const predicted = scorePredByCouple.get(r.coupleId) ?? null;
      const actual = r.judgeScore!;
      const points =
        predicted != null ? scoreProximity(predicted, actual) : 0;
      scorePts += points;
      return {
        coupleId: r.coupleId,
        celebrityName: coupleName.get(r.coupleId) ?? "Couple",
        predicted,
        actual,
        points,
      };
    })
    .sort((a, b) => a.celebrityName.localeCompare(b.celebrityName));

  let seasonPts = 0;
  if (episode.isFinale && activeWinnerCoupleId) {
    const seasonPred = predictions.find(
      (p) => p.kind === PredictionKind.SEASON_WINNER,
    );
    if (seasonPred?.seasonWinnerCoupleId === activeWinnerCoupleId) {
      seasonPts = SEASON_WINNER_POINTS;
    }
  }

  return {
    episodeId: episode.id,
    episodeNumber: episode.episodeNumber,
    title: episode.title,
    elimPts,
    scorePts,
    seasonPts,
    total: elimPts + scorePts + seasonPts,
    eliminatedCoupleId,
    actualEliminatedIds,
    scores,
  };
}

export async function getSeasonWinnerCoupleId(): Promise<string | null> {
  const active = await prisma.couple.findMany({
    where: { status: CoupleStatus.ACTIVE },
    select: { id: true },
  });
  return active.length === 1 ? active[0].id : null;
}

export async function scoreEpisodeForUser(
  userId: string,
  episodeId: string,
): Promise<EpisodeScoreBreakdown | null> {
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    include: { actualResults: true },
  });
  if (!episode || episode.actualResults.length === 0) return null;

  const [predictions, couples, activeWinnerCoupleId] = await Promise.all([
    prisma.prediction.findMany({
      where: {
        userId,
        OR: [
          { kind: PredictionKind.SEASON_WINNER },
          {
            episodeId,
            kind: {
              in: [
                PredictionKind.WEEKLY_ELIMINATION,
                PredictionKind.WEEKLY_SCORE,
              ],
            },
          },
        ],
      },
    }),
    prisma.couple.findMany({
      select: { id: true, celebrityName: true },
    }),
    episode.isFinale ? getSeasonWinnerCoupleId() : Promise.resolve(null),
  ]);

  return scoreEpisodeFromData({
    episode,
    results: episode.actualResults,
    predictions,
    couples,
    activeWinnerCoupleId,
  });
}

export type LeaderboardEntry = {
  userId: string;
  displayName: string;
  totalPoints: number;
  rank: number;
  episodes: EpisodeScoreBreakdown[];
};

export async function recalculateAllPoints(): Promise<
  { userId: string; totalPoints: number }[]
> {
  const [users, episodes, couples, activeWinnerCoupleId] = await Promise.all([
    prisma.user.findMany({
      where: { displayName: { not: null } },
      select: { id: true, displayName: true },
    }),
    prisma.episode.findMany({
      where: { actualResults: { some: {} } },
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
          PredictionKind.WEEKLY_SCORE,
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

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const [users, episodes, couples, activeWinnerCoupleId] = await Promise.all([
    prisma.user.findMany({
      where: { displayName: { not: null } },
      select: { id: true, displayName: true, totalPoints: true },
      orderBy: [{ totalPoints: "desc" }, { displayName: "asc" }],
    }),
    prisma.episode.findMany({
      where: { actualResults: { some: {} } },
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
          PredictionKind.WEEKLY_SCORE,
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
      episodes: episodeBreakdowns,
    };
  });
}
