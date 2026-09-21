"use server";

import { CoupleStatus, PredictionKind, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  getPredictableEpisode,
  isEpisodeLocked,
} from "@/lib/predictions";
import { prisma } from "@/lib/prisma";

export type SavePredictionsInput = {
  episodeId: string;
  seasonWinnerCoupleId?: string | null;
  eliminatedCoupleId?: string | null;
  /** Ordered highest → lowest; rank 1 = first entry */
  rankOrder?: string[];
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
    return { ok: false, error: "Predictions are locked (Tue 8pm ET)" };
  }

  const activeCouples = await prisma.couple.findMany({
    where: { status: CoupleStatus.ACTIVE },
    select: { id: true },
  });
  const activeIds = new Set(activeCouples.map((c) => c.id));

  const hasSeason = Boolean(input.seasonWinnerCoupleId);
  const hasElim = Boolean(input.eliminatedCoupleId);
  const hasRanks = Boolean(input.rankOrder?.length);

  if (!hasSeason && !hasElim && !hasRanks) {
    return { ok: false, error: "Nothing to save" };
  }

  if (hasSeason && !activeIds.has(input.seasonWinnerCoupleId!)) {
    return { ok: false, error: "Pick an active couple for season winner" };
  }
  if (hasElim && !activeIds.has(input.eliminatedCoupleId!)) {
    return { ok: false, error: "Pick an active couple for elimination" };
  }

  if (hasRanks) {
    const order = input.rankOrder!;
    if (order.length !== activeCouples.length) {
      return { ok: false, error: "Rank every active couple" };
    }
    const seen = new Set<string>();
    for (const id of order) {
      if (!activeIds.has(id) || seen.has(id)) {
        return { ok: false, error: "Invalid rank order" };
      }
      seen.add(id);
    }
  }

  const eventPayload: Prisma.InputJsonObject = {
    ...(hasSeason
      ? { seasonWinnerCoupleId: input.seasonWinnerCoupleId }
      : {}),
    ...(hasElim ? { eliminatedCoupleId: input.eliminatedCoupleId } : {}),
    ...(hasRanks ? { rankOrder: input.rankOrder } : {}),
  };

  await prisma.$transaction(async (tx) => {
    if (hasSeason) {
      const existingWinner = await tx.prediction.findFirst({
        where: { userId, kind: PredictionKind.SEASON_WINNER },
      });
      if (existingWinner) {
        const coupleChanged =
          existingWinner.seasonWinnerCoupleId !== input.seasonWinnerCoupleId;
        await tx.prediction.update({
          where: { id: existingWinner.id },
          data: {
            seasonWinnerCoupleId: input.seasonWinnerCoupleId!,
            ...(coupleChanged
              ? { seasonWinnerFromEpisodeNumber: episode.episodeNumber }
              : existingWinner.seasonWinnerFromEpisodeNumber == null
                ? { seasonWinnerFromEpisodeNumber: episode.episodeNumber }
                : {}),
            episodeId: null,
            coupleId: null,
            predictedScore: null,
            predictedRank: null,
            predictedEliminatedCoupleId: null,
          },
        });
      } else {
        await tx.prediction.create({
          data: {
            userId,
            kind: PredictionKind.SEASON_WINNER,
            seasonWinnerCoupleId: input.seasonWinnerCoupleId!,
            seasonWinnerFromEpisodeNumber: episode.episodeNumber,
          },
        });
      }
    }

    if (hasElim) {
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
            predictedEliminatedCoupleId: input.eliminatedCoupleId!,
            seasonWinnerCoupleId: null,
            coupleId: null,
            predictedScore: null,
            predictedRank: null,
          },
        });
      } else {
        await tx.prediction.create({
          data: {
            userId,
            kind: PredictionKind.WEEKLY_ELIMINATION,
            episodeId: input.episodeId,
            predictedEliminatedCoupleId: input.eliminatedCoupleId!,
          },
        });
      }
    }

    if (hasRanks) {
      // Upsert only — never delete rank rows (preserves createdAt / history)
      for (const [index, coupleId] of input.rankOrder!.entries()) {
        const existing = await tx.prediction.findFirst({
          where: {
            userId,
            episodeId: input.episodeId,
            coupleId,
            kind: PredictionKind.WEEKLY_RANK,
          },
        });
        if (existing) {
          await tx.prediction.update({
            where: { id: existing.id },
            data: { predictedRank: index + 1 },
          });
        } else {
          await tx.prediction.create({
            data: {
              userId,
              kind: PredictionKind.WEEKLY_RANK,
              episodeId: input.episodeId,
              coupleId,
              predictedRank: index + 1,
            },
          });
        }
      }
    }

    // Append-only audit trail for timelines (never update/delete these)
    await tx.predictionEvent.create({
      data: {
        userId,
        episodeId: input.episodeId,
        payload: eventPayload,
      },
    });
  });

  revalidatePath("/predict");
  revalidatePath("/");
  return { ok: true };
}
