"use server";

import { CoupleStatus, PredictionKind } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  clampScore,
  getPredictableEpisode,
  isEpisodeLocked,
  SCORE_MAX,
  SCORE_MIN,
} from "@/lib/predictions";
import { prisma } from "@/lib/prisma";

export type SavePredictionsInput = {
  episodeId: string;
  seasonWinnerCoupleId: string;
  eliminatedCoupleId: string;
  scores: { coupleId: string; score: number }[];
};

export type SavePredictionsResult =
  | { ok: true }
  | { ok: false; error: string };

export async function savePredictions(
  input: SavePredictionsInput,
): Promise<SavePredictionsResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, error: "You must be signed in" };
  }

  const episode = await prisma.episode.findUnique({
    where: { id: input.episodeId },
  });
  if (!episode) {
    return { ok: false, error: "Episode not found" };
  }

  const predictable = await getPredictableEpisode();
  if (!predictable || predictable.id !== episode.id) {
    return { ok: false, error: "This episode is not open for predictions" };
  }

  if (isEpisodeLocked(episode)) {
    return { ok: false, error: "Predictions are locked for this episode" };
  }

  const activeCouples = await prisma.couple.findMany({
    where: { status: CoupleStatus.ACTIVE },
    select: { id: true },
  });
  const activeIds = new Set(activeCouples.map((c) => c.id));

  if (!activeIds.has(input.seasonWinnerCoupleId)) {
    return { ok: false, error: "Pick an active couple for season winner" };
  }
  if (!activeIds.has(input.eliminatedCoupleId)) {
    return { ok: false, error: "Pick an active couple for elimination" };
  }

  if (input.scores.length !== activeCouples.length) {
    return { ok: false, error: "Predict a score for every active couple" };
  }

  const scoreCoupleIds = new Set<string>();
  for (const entry of input.scores) {
    if (!activeIds.has(entry.coupleId)) {
      return { ok: false, error: "Score includes an inactive couple" };
    }
    if (scoreCoupleIds.has(entry.coupleId)) {
      return { ok: false, error: "Duplicate couple score" };
    }
    scoreCoupleIds.add(entry.coupleId);
    if (
      !Number.isFinite(entry.score) ||
      entry.score < SCORE_MIN ||
      entry.score > SCORE_MAX
    ) {
      return {
        ok: false,
        error: `Scores must be between ${SCORE_MIN} and ${SCORE_MAX}`,
      };
    }
  }

  if (scoreCoupleIds.size !== activeIds.size) {
    return { ok: false, error: "Predict a score for every active couple" };
  }

  await prisma.$transaction(async (tx) => {
    const existingWinner = await tx.prediction.findFirst({
      where: { userId, kind: PredictionKind.SEASON_WINNER },
    });
    if (existingWinner) {
      await tx.prediction.update({
        where: { id: existingWinner.id },
        data: {
          seasonWinnerCoupleId: input.seasonWinnerCoupleId,
          episodeId: null,
          coupleId: null,
          predictedScore: null,
          predictedEliminatedCoupleId: null,
        },
      });
    } else {
      await tx.prediction.create({
        data: {
          userId,
          kind: PredictionKind.SEASON_WINNER,
          seasonWinnerCoupleId: input.seasonWinnerCoupleId,
        },
      });
    }

    const existingElim = await tx.prediction.findFirst({
      where: {
        userId,
        kind: PredictionKind.WEEKLY_ELIMINATION,
        episodeId: input.episodeId,
      },
    });
    if (existingElim) {
      await tx.prediction.update({
        where: { id: existingElim.id },
        data: {
          predictedEliminatedCoupleId: input.eliminatedCoupleId,
          seasonWinnerCoupleId: null,
          coupleId: null,
          predictedScore: null,
        },
      });
    } else {
      await tx.prediction.create({
        data: {
          userId,
          kind: PredictionKind.WEEKLY_ELIMINATION,
          episodeId: input.episodeId,
          predictedEliminatedCoupleId: input.eliminatedCoupleId,
        },
      });
    }

    for (const entry of input.scores) {
      const score = clampScore(entry.score);
      const existingScore = await tx.prediction.findFirst({
        where: {
          userId,
          kind: PredictionKind.WEEKLY_SCORE,
          episodeId: input.episodeId,
          coupleId: entry.coupleId,
        },
      });
      if (existingScore) {
        await tx.prediction.update({
          where: { id: existingScore.id },
          data: {
            predictedScore: score,
            seasonWinnerCoupleId: null,
            predictedEliminatedCoupleId: null,
          },
        });
      } else {
        await tx.prediction.create({
          data: {
            userId,
            kind: PredictionKind.WEEKLY_SCORE,
            episodeId: input.episodeId,
            coupleId: entry.coupleId,
            predictedScore: score,
          },
        });
      }
    }
  });

  revalidatePath("/predict");
  return { ok: true };
}
