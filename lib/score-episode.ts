import {
  PredictionKind,
  type ActualResult,
  type Episode,
  type Prediction,
} from "@prisma/client";

import {
  buildActualRankRanges,
  resolveScoringRuleset,
  scoreRankPoints,
} from "./scoring-rules";
import { scoreSeasonWinnerPoints } from "./season-scoring";

export type EpisodeScoreBreakdown = {
  episodeId: string;
  episodeNumber: number;
  title: string;
  elimPts: number;
  rankPts: number;
  seasonPts: number;
  total: number;
  /** First predicted elim (legacy); prefer eliminatedCoupleIds. */
  eliminatedCoupleId: string | null;
  eliminatedCoupleIds: string[];
  predictedElimName: string | null;
  predictedElimNames: string[];
  predictedNoElimination: boolean;
  actualNoElimination: boolean;
  actualEliminatedIds: string[];
  actualElimNames: string[];
  ranks: {
    coupleId: string;
    celebrityName: string;
    predictedRank: number | null;
    /** Competition rank min (display / sort). */
    actualRank: number | null;
    /** Competition rank max; equals actualRank when no tie. */
    actualRankMax: number | null;
    points: number;
  }[];
};

function resolvePredictedElimIds(
  elimPred:
    | {
        predictedEliminatedCoupleId?: string | null;
        predictedEliminatedCoupleIds?: string[];
        predictsNoElimination?: boolean;
      }
    | undefined,
): string[] {
  if (!elimPred || elimPred.predictsNoElimination) return [];
  if (elimPred.predictedEliminatedCoupleIds?.length) {
    return [...new Set(elimPred.predictedEliminatedCoupleIds)];
  }
  if (elimPred.predictedEliminatedCoupleId) {
    return [elimPred.predictedEliminatedCoupleId];
  }
  return [];
}

/** Full elimPoints per correctly predicted elimination (multi-elim weeks stack). */
export function scoreEliminationPoints(input: {
  elimPoints: number;
  expectedEliminationCount: number;
  predictedIds: string[];
  actualEliminatedIds: string[];
  predictedNoElimination: boolean;
  actualNoElimination: boolean;
}): number {
  const {
    elimPoints,
    expectedEliminationCount: n,
    predictedIds,
    actualEliminatedIds,
    predictedNoElimination,
    actualNoElimination,
  } = input;

  if (n <= 0) {
    return predictedNoElimination && actualNoElimination ? elimPoints : 0;
  }

  const actualSet = new Set(actualEliminatedIds);
  const hits = predictedIds.filter((id) => actualSet.has(id)).length;
  return hits * elimPoints;
}

/** Legacy unique ranks: score desc, then celebrity name for ties. */
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
  episode: Pick<
    Episode,
    "id" | "episodeNumber" | "title" | "isFinale" | "noElimination"
  > & {
    expectedEliminationCount?: number;
  };
  results: Pick<ActualResult, "coupleId" | "judgeScore" | "isEliminated">[];
  predictions: (Pick<
    Prediction,
    | "kind"
    | "seasonWinnerCoupleId"
    | "seasonWinnerFromEpisodeNumber"
    | "predictedEliminatedCoupleId"
    | "predictsNoElimination"
    | "coupleId"
    | "predictedRank"
  > & {
    predictedEliminatedCoupleIds?: string[];
  })[];
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
  const eliminatedCoupleIds = resolvePredictedElimIds(elimPred);
  const eliminatedCoupleId = eliminatedCoupleIds[0] ?? null;
  const actualEliminatedIds = results
    .filter((r) => r.isEliminated)
    .map((r) => r.coupleId);

  const expectedEliminationCount =
    episode.expectedEliminationCount ?? (episode.noElimination ? 0 : 1);
  const predictedNoElimination = elimPred?.predictsNoElimination ?? false;
  const actualNoElimination =
    (episode.noElimination || expectedEliminationCount === 0) &&
    actualEliminatedIds.length === 0;
  const elimPts = scoreEliminationPoints({
    elimPoints: ruleset.elimPoints,
    expectedEliminationCount,
    predictedIds: eliminatedCoupleIds,
    actualEliminatedIds,
    predictedNoElimination,
    actualNoElimination,
  });

  const useRanges = ruleset.rank.type === "distance_bands";
  const actualRanges = useRanges ? buildActualRankRanges(results) : null;
  const actualRanks = useRanges ? null : buildActualRanks(results, couples);
  const n = useRanges ? actualRanges!.size : actualRanks!.size;

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

  const coupleIds = useRanges
    ? [...actualRanges!.keys()]
    : [...actualRanks!.keys()];

  let rankPts = 0;
  const ranks = coupleIds
    .map((coupleId) => {
      const predictedRank = predictedRanks.get(coupleId) ?? null;
      let actualRank: number;
      let actualRankMax: number;
      let points = 0;

      if (useRanges) {
        const range = actualRanges!.get(coupleId)!;
        actualRank = range.min;
        actualRankMax = range.max;
        if (predictedRank != null && n > 0) {
          points = scoreRankPoints(
            predictedRank,
            range.min,
            n,
            ruleset,
            range,
          );
        }
      } else {
        actualRank = actualRanks!.get(coupleId)!;
        actualRankMax = actualRank;
        if (predictedRank != null && n > 0) {
          points = scoreRankPoints(predictedRank, actualRank, n, ruleset);
        }
      }

      rankPts += points;
      return {
        coupleId,
        celebrityName: coupleName.get(coupleId) ?? "Couple",
        predictedRank,
        actualRank,
        actualRankMax,
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

  const predictedElimNames = eliminatedCoupleIds.map(
    (id) => coupleName.get(id) ?? "Unknown",
  );

  return {
    episodeId: episode.id,
    episodeNumber: episode.episodeNumber,
    title: episode.title,
    elimPts,
    rankPts,
    seasonPts,
    total: elimPts + rankPts + seasonPts,
    eliminatedCoupleId,
    eliminatedCoupleIds,
    predictedElimName:
      predictedElimNames.length > 0 ? predictedElimNames.join(", ") : null,
    predictedElimNames,
    predictedNoElimination,
    actualNoElimination,
    actualEliminatedIds,
    actualElimNames: actualEliminatedIds.map(
      (id) => coupleName.get(id) ?? "Unknown",
    ),
    ranks,
  };
}
