/**
 * Append-only scoring rulesets keyed by episode number.
 *
 * - Never edit past entries — append a new ruleset with a higher
 *   `effectiveFromEpisode` when fine-tuning points.
 * - Ep 1–2 use legacy `n - |pred - act|` + elim 50.
 * - Ep 3+ use per-couple distance bands [3, 2, 1] + elim 25.
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
        /** Index = |predictedRank - actualRank|; per couple. */
        pointsByDistance: [number, number, number];
      };
    };

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

/** Legacy per-couple points: max(0, n - |predictedRank - actualRank|). */
export function scoreRankDistanceLegacy(
  predictedRank: number,
  actualRank: number,
  n: number,
): number {
  return Math.max(0, n - Math.abs(predictedRank - actualRank));
}

/** Points for one couple under the given ruleset. */
export function scoreRankPoints(
  predictedRank: number,
  actualRank: number,
  n: number,
  ruleset: ScoringRuleset,
): number {
  if (ruleset.rank.type === "legacy_n_minus_distance") {
    return scoreRankDistanceLegacy(predictedRank, actualRank, n);
  }
  const distance = Math.abs(predictedRank - actualRank);
  return ruleset.rank.pointsByDistance[distance] ?? 0;
}
