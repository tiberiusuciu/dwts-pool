"use server";

import {
  CoupleStatus,
  EpisodeStatus,
  PredictionKind,
  Role,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { getLiveEpisodeSnapshot } from "@/lib/live-breakdown";
import {
  publishLeaderboardUpdate,
  publishLiveUpdate,
} from "@/lib/live-bus";
import { clampScore, SCORE_MIN } from "@/lib/scores";
import { prisma } from "@/lib/prisma";
import { captureEpisodeRaceSnapshot } from "@/lib/race-snapshots";
import { recalculateAllPoints } from "@/lib/scoring";

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return null;
  }
  return session;
}

async function broadcastEpisode(episodeId: string) {
  const snapshot = await getLiveEpisodeSnapshot(episodeId);
  if (snapshot) {
    publishLiveUpdate(snapshot);
  }
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/live");
}

export async function setEpisodeStatus(
  episodeId: string,
  status: EpisodeStatus,
): Promise<ActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "Admin only" };
  }

  await prisma.episode.update({
    where: { id: episodeId },
    data: { status },
  });

  // Totals must drop rank/elim/season points when an episode is reset to UPCOMING
  await recalculateAllPoints();
  if (status === EpisodeStatus.LIVE) {
    await captureEpisodeRaceSnapshot(episodeId);
  }
  if (status === EpisodeStatus.UPCOMING) {
    await prisma.episodeRaceSnapshot.deleteMany({ where: { episodeId } });
  }
  publishLeaderboardUpdate();
  revalidatePath("/leaderboard");

  await broadcastEpisode(episodeId);
  return { ok: true };
}

export async function setEpisodeFinale(
  episodeId: string,
  isFinale: boolean,
): Promise<ActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "Admin only" };
  }

  await prisma.$transaction(async (tx) => {
    if (isFinale) {
      await tx.episode.updateMany({
        where: { isFinale: true, NOT: { id: episodeId } },
        data: { isFinale: false },
      });
    }
    await tx.episode.update({
      where: { id: episodeId },
      data: { isFinale },
    });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/live");
  revalidatePath("/leaderboard");
  return { ok: true };
}

export async function setEpisodeNoElimination(
  episodeId: string,
  noElimination: boolean,
): Promise<ActionResult> {
  return setExpectedEliminationCount(episodeId, noElimination ? 0 : 1);
}

export async function setExpectedEliminationCount(
  episodeId: string,
  count: number,
): Promise<ActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "Admin only" };
  }

  if (!Number.isInteger(count) || count < 0 || count > 20) {
    return { ok: false, error: "Elimination count must be an integer from 0 to 20" };
  }

  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    select: { status: true, expectedEliminationCount: true },
  });
  if (!episode) {
    return { ok: false, error: "Episode not found" };
  }

  if (count === 0) {
    const eliminatedCount = await prisma.actualResult.count({
      where: { episodeId, isEliminated: true },
    });
    if (eliminatedCount > 0) {
      return {
        ok: false,
        error: "Un-eliminate every couple before marking no elimination",
      };
    }
  }

  const countChanged = episode.expectedEliminationCount !== count;

  await prisma.$transaction(async (tx) => {
    await tx.episode.update({
      where: { id: episodeId },
      data: {
        expectedEliminationCount: count,
        noElimination: count === 0,
      },
    });

    // Reset elim picks when the week’s elim rules change (update in place; never delete).
    if (countChanged) {
      const elimPreds = await tx.prediction.findMany({
        where: {
          episodeId,
          kind: PredictionKind.WEEKLY_ELIMINATION,
        },
        select: { id: true, userId: true },
      });
      if (elimPreds.length > 0) {
        await tx.prediction.updateMany({
          where: {
            episodeId,
            kind: PredictionKind.WEEKLY_ELIMINATION,
          },
          data: {
            predictedEliminatedCoupleId: null,
            predictedEliminatedCoupleIds: [],
            predictsNoElimination: false,
          },
        });
        await tx.predictionEvent.createMany({
          data: elimPreds.map((p) => ({
            userId: p.userId,
            episodeId,
            payload: {
              eliminatedCoupleId: null,
              eliminatedCoupleIds: [],
              predictsNoElimination: false,
              reason: "admin_expected_elimination_count_changed",
              expectedEliminationCount: count,
            },
          })),
        });
      }
    }
  });

  await recalculateAllPoints();
  if (episode.status === EpisodeStatus.LIVE) {
    await captureEpisodeRaceSnapshot(episodeId);
  }
  publishLeaderboardUpdate();
  revalidatePath("/leaderboard");
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/live");
  await broadcastEpisode(episodeId);
  return { ok: true };
}

export async function upsertLiveResult(input: {
  episodeId: string;
  coupleId: string;
  judgeScore: number;
  isEliminated: boolean;
}): Promise<ActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "Admin only" };
  }

  if (!Number.isFinite(input.judgeScore) || input.judgeScore < SCORE_MIN) {
    return {
      ok: false,
      error: `Score must be at least ${SCORE_MIN}`,
    };
  }

  const score = clampScore(input.judgeScore);

  await prisma.$transaction(async (tx) => {
    await tx.actualResult.upsert({
      where: {
        episodeId_coupleId: {
          episodeId: input.episodeId,
          coupleId: input.coupleId,
        },
      },
      create: {
        episodeId: input.episodeId,
        coupleId: input.coupleId,
        judgeScore: score,
        isEliminated: input.isEliminated,
      },
      update: {
        judgeScore: score,
        isEliminated: input.isEliminated,
      },
    });

    if (input.isEliminated) {
      await tx.couple.update({
        where: { id: input.coupleId },
        data: {
          status: CoupleStatus.ELIMINATED,
          eliminatedEpisodeId: input.episodeId,
        },
      });
    } else {
      const couple = await tx.couple.findUnique({
        where: { id: input.coupleId },
        select: { eliminatedEpisodeId: true },
      });
      if (couple?.eliminatedEpisodeId === input.episodeId) {
        await tx.couple.update({
          where: { id: input.coupleId },
          data: {
            status: CoupleStatus.ACTIVE,
            eliminatedEpisodeId: null,
          },
        });
      }
    }
  });

  await broadcastEpisode(input.episodeId);

  const episode = await prisma.episode.findUnique({
    where: { id: input.episodeId },
    select: { status: true },
  });
  if (episode?.status === EpisodeStatus.LIVE) {
    await captureEpisodeRaceSnapshot(input.episodeId);
  }
  await recalculateAllPoints();
  publishLeaderboardUpdate();
  revalidatePath("/leaderboard");
  revalidatePath("/");

  return { ok: true };
}

export async function clearEpisodeResults(
  episodeId: string,
): Promise<ActionResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "Admin only" };
  }

  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    select: { id: true },
  });
  if (!episode) {
    return { ok: false, error: "Episode not found" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.actualResult.deleteMany({ where: { episodeId } });
    await tx.episodeRaceSnapshot.deleteMany({ where: { episodeId } });
    await tx.couple.updateMany({
      where: { eliminatedEpisodeId: episodeId },
      data: {
        status: CoupleStatus.ACTIVE,
        eliminatedEpisodeId: null,
      },
    });
  });

  await recalculateAllPoints();
  publishLeaderboardUpdate();
  revalidatePath("/leaderboard");
  revalidatePath("/");
  await broadcastEpisode(episodeId);
  return { ok: true };
}

export async function calculateAndBroadcastPoints(): Promise<
  ActionResult & { totals?: number }
> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "Admin only" };
  }

  const updates = await recalculateAllPoints();
  const live = await prisma.episode.findFirst({
    where: { status: EpisodeStatus.LIVE },
    select: { id: true },
  });
  if (live) {
    await captureEpisodeRaceSnapshot(live.id);
    await broadcastEpisode(live.id);
  }
  publishLeaderboardUpdate();

  revalidatePath("/leaderboard");
  revalidatePath("/");
  revalidatePath("/admin");

  return { ok: true, totals: updates.length };
}
