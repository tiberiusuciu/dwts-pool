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
  eliminatedCoupleId: string | null;
  predictedElimName: string | null;
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
