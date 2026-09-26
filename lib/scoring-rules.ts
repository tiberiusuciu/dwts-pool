/**
 * Append-only scoring rulesets keyed by episode number.
 *
 * - Never edit past entries — append a new ruleset with a higher
 *   `effectiveFromEpisode` when fine-tuning points.
 * - Ep 1–2 use legacy `n - |pred - act|` + elim 50.
 * - Ep 3+ use per-couple distance bands [3, 2, 1] + elim 25,
 *   with judge-score ties scored via rank ranges (wildcard).
 */

export type ScoringRuleset =
  | {
      effectiveFromEpisode: number;
      elimPoints: number;
      rank: { type: "legacy_n_minus_distance" };
    }
  | {
      effectiveFromEpisode: number;
      elimPoints: number;
      rank: {
        type: "distance_bands";
        /** Index = distance to actual rank range; per couple. */
        pointsByDistance: [number, number, number];
      };
    };

export type RankRange = { min: number; max: number };

export const SCORING_RULESETS: ScoringRuleset[] = [
  {
    effectiveFromEpisode: 1,
    elimPoints: 50,
    rank: { type: "legacy_n_minus_distance" },
  },
  {
    effectiveFromEpisode: 3,
    elimPoints: 25,
    rank: { type: "distance_bands", pointsByDistance: [3, 2, 1] },
  },
];

export function resolveScoringRuleset(episodeNumber: number): ScoringRuleset {
  let matched = SCORING_RULESETS[0];
  for (const ruleset of SCORING_RULESETS) {
    if (ruleset.effectiveFromEpisode <= episodeNumber) {
      matched = ruleset;
    }
  }
  return matched;
}

/**
 * Competition rank ranges from judge scores (highest first).
 * Ties share [min, max]; next group starts at max+1. No name tiebreak.
 */
export function buildActualRankRanges(
  results: { coupleId: string; judgeScore: number | null }[],
): Map<string, RankRange> {
  const scored = results
    .filter((r) => r.judgeScore != null)
    .sort((a, b) => (b.judgeScore ?? 0) - (a.judgeScore ?? 0));

  const ranges = new Map<string, RankRange>();
  let i = 0;
  while (i < scored.length) {
    const score = scored[i]!.judgeScore;
    let j = i + 1;
    while (j < scored.length && scored[j]!.judgeScore === score) j++;
    const min = i + 1;
    const max = j;
    for (let k = i; k < j; k++) {
      ranges.set(scored[k]!.coupleId, { min, max });
    }
    i = j;
  }
  return ranges;
}

/** Distance from predicted rank to [min, max] (0 if inside / wildcard hit). */
export function distanceToRankRange(
  predictedRank: number,
  min: number,
  max: number,
): number {
  if (predictedRank >= min && predictedRank <= max) return 0;
  if (predictedRank < min) return min - predictedRank;
  return predictedRank - max;
}

/** Legacy per-couple points: max(0, n - |predictedRank - actualRank|). */
export function scoreRankDistanceLegacy(
  predictedRank: number,
  actualRank: number,
  n: number,
): number {
  return Math.max(0, n - Math.abs(predictedRank - actualRank));
}

/**
 * Points for one couple under the given ruleset.
 * For distance_bands, pass `actualRange`; `actualRank` is used as a
 * single-rank fallback (min === max) when range is omitted.
 */
export function scoreRankPoints(
  predictedRank: number,
  actualRank: number,
  n: number,
  ruleset: ScoringRuleset,
  actualRange?: RankRange,
): number {
  if (ruleset.rank.type === "legacy_n_minus_distance") {
    return scoreRankDistanceLegacy(predictedRank, actualRank, n);
  }
  const min = actualRange?.min ?? actualRank;
  const max = actualRange?.max ?? actualRank;
  const distance = distanceToRankRange(predictedRank, min, max);
  return ruleset.rank.pointsByDistance[distance] ?? 0;
}
