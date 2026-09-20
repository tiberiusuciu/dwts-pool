import {
  CoupleStatus,
  EpisodeStatus,
  PredictionKind,
  type Couple,
  type Episode,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const SCORE_MIN = 3;
export const SCORE_MAX = 30;
export const SCORE_DEFAULT = 18;

export type CoupleOption = Pick<Couple, "id" | "celebrityName" | "proName">;

export type UserPredictionState = {
  seasonWinnerCoupleId: string | null;
  eliminatedCoupleId: string | null;
  scores: Record<string, number>;
};

export function isEpisodeLocked(episode: Pick<Episode, "status">) {
  return episode.status !== EpisodeStatus.UPCOMING;
}

export async function getPredictableEpisode() {
  return prisma.episode.findFirst({
    where: { status: EpisodeStatus.UPCOMING },
    orderBy: { episodeNumber: "asc" },
  });
}

export async function getActiveCouples(): Promise<CoupleOption[]> {
  return prisma.couple.findMany({
    where: { status: CoupleStatus.ACTIVE },
    orderBy: { celebrityName: "asc" },
    select: { id: true, celebrityName: true, proName: true },
  });
}

export async function getUserPredictions(
  userId: string,
  episodeId: string,
): Promise<UserPredictionState> {
  const rows = await prisma.prediction.findMany({
    where: {
      userId,
      OR: [
        { kind: PredictionKind.SEASON_WINNER },
        {
          kind: PredictionKind.WEEKLY_ELIMINATION,
          episodeId,
        },
        {
          kind: PredictionKind.WEEKLY_SCORE,
          episodeId,
        },
      ],
    },
  });

  const scores: Record<string, number> = {};
  let seasonWinnerCoupleId: string | null = null;
  let eliminatedCoupleId: string | null = null;

  for (const row of rows) {
    if (row.kind === PredictionKind.SEASON_WINNER) {
      seasonWinnerCoupleId = row.seasonWinnerCoupleId;
    } else if (row.kind === PredictionKind.WEEKLY_ELIMINATION) {
      eliminatedCoupleId = row.predictedEliminatedCoupleId;
    } else if (row.kind === PredictionKind.WEEKLY_SCORE && row.coupleId) {
      scores[row.coupleId] = row.predictedScore ?? SCORE_DEFAULT;
    }
  }

  return { seasonWinnerCoupleId, eliminatedCoupleId, scores };
}

export function clampScore(value: number) {
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, Math.round(value)));
}
