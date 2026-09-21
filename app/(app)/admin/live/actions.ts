"use server";

import { CoupleStatus, EpisodeStatus, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { getLiveEpisodeSnapshot } from "@/lib/live-breakdown";
import {
  publishLeaderboardUpdate,
  publishLiveUpdate,
} from "@/lib/live-bus";
import { clampScore, SCORE_MIN } from "@/lib/scores";
import { prisma } from "@/lib/prisma";
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
  publishLeaderboardUpdate();
  revalidatePath("/leaderboard");
  revalidatePath("/");
  revalidatePath("/admin");

  return { ok: true, totals: updates.length };
}
