import { EpisodeStatus, PredictionKind } from "@prisma/client";

import type { LiveEpisodePayload, LiveResultRow } from "@/lib/live-bus";
import { prisma } from "@/lib/prisma";

export async function getLiveEpisodeSnapshot(
  episodeId: string,
): Promise<LiveEpisodePayload | null> {
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    include: {
      actualResults: {
        select: {
          coupleId: true,
          judgeScore: true,
          isEliminated: true,
        },
      },
    },
  });

  if (!episode) return null;

  return {
    episodeId: episode.id,
    status: episode.status,
    results: episode.actualResults.map(
      (r): LiveResultRow => ({
        coupleId: r.coupleId,
        judgeScore: r.judgeScore,
        isEliminated: r.isEliminated,
      }),
    ),
    updatedAt: new Date().toISOString(),
  };
}

export type BreakdownCouple = {
  id: string;
  celebrityName: string;
  proName: string;
};

export type BreakdownPlayer = {
  userId: string;
  displayName: string;
  eliminatedCoupleId: string | null;
  scores: Record<string, number>;
  elimCorrect: boolean;
  scoreError: number | null;
  isScoreLeader: boolean;
};

export type BreakdownDTO = {
  episode: {
    id: string;
    episodeNumber: number;
    title: string;
    status: EpisodeStatus;
  };
  couples: BreakdownCouple[];
  results: LiveResultRow[];
  players: BreakdownPlayer[];
};

export function computeHighlights(
  players: Omit<BreakdownPlayer, "elimCorrect" | "scoreError" | "isScoreLeader">[],
  results: LiveResultRow[],
): BreakdownPlayer[] {
  const eliminatedIds = new Set(
    results.filter((r) => r.isEliminated).map((r) => r.coupleId),
  );
  const scored = results.filter((r) => r.judgeScore != null);

  const withMeta = players.map((player) => {
    const elimCorrect =
      eliminatedIds.size > 0 &&
      player.eliminatedCoupleId != null &&
      eliminatedIds.has(player.eliminatedCoupleId);

    let scoreError: number | null = null;
    if (scored.length > 0 && Object.keys(player.scores).length > 0) {
      let total = 0;
      let count = 0;
      for (const result of scored) {
        const predicted = player.scores[result.coupleId];
        if (predicted == null || result.judgeScore == null) continue;
        total += Math.abs(predicted - result.judgeScore);
        count += 1;
      }
      scoreError = count > 0 ? total : null;
    }

    return { ...player, elimCorrect, scoreError, isScoreLeader: false };
  });

  const errors = withMeta
    .map((p) => p.scoreError)
    .filter((e): e is number => e != null);
  const best = errors.length > 0 ? Math.min(...errors) : null;

  return withMeta.map((p) => ({
    ...p,
    isScoreLeader: best != null && p.scoreError === best,
  }));
}

export async function getBreakdownForEpisode(
  episodeId: string,
): Promise<BreakdownDTO | null> {
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    include: {
      actualResults: true,
    },
  });
  if (!episode) return null;

  const couples = await prisma.couple.findMany({
    orderBy: { celebrityName: "asc" },
    select: { id: true, celebrityName: true, proName: true },
  });

  const users = await prisma.user.findMany({
    where: { displayName: { not: null } },
    select: { id: true, displayName: true },
    orderBy: { displayName: "asc" },
  });

  const predictions = await prisma.prediction.findMany({
    where: {
      episodeId,
      kind: {
        in: [PredictionKind.WEEKLY_ELIMINATION, PredictionKind.WEEKLY_SCORE],
      },
      userId: { in: users.map((u) => u.id) },
    },
  });

  const byUser = new Map<
    string,
    { eliminatedCoupleId: string | null; scores: Record<string, number> }
  >();

  for (const user of users) {
    byUser.set(user.id, { eliminatedCoupleId: null, scores: {} });
  }

  for (const pred of predictions) {
    const bucket = byUser.get(pred.userId);
    if (!bucket) continue;
    if (pred.kind === PredictionKind.WEEKLY_ELIMINATION) {
      bucket.eliminatedCoupleId = pred.predictedEliminatedCoupleId;
    } else if (pred.kind === PredictionKind.WEEKLY_SCORE && pred.coupleId != null) {
      bucket.scores[pred.coupleId] = pred.predictedScore ?? 0;
    }
  }

  const results: LiveResultRow[] = episode.actualResults.map((r) => ({
    coupleId: r.coupleId,
    judgeScore: r.judgeScore,
    isEliminated: r.isEliminated,
  }));

  const players = computeHighlights(
    users.map((u) => {
      const bucket = byUser.get(u.id)!;
      return {
        userId: u.id,
        displayName: u.displayName ?? "Player",
        eliminatedCoupleId: bucket.eliminatedCoupleId,
        scores: bucket.scores,
      };
    }),
    results,
  );

  return {
    episode: {
      id: episode.id,
      episodeNumber: episode.episodeNumber,
      title: episode.title,
      status: episode.status,
    },
    couples,
    results,
    players,
  };
}

export async function resolveFocusEpisodeId() {
  const live = await prisma.episode.findFirst({
    where: { status: "LIVE" },
    orderBy: { episodeNumber: "asc" },
  });
  if (live) return live.id;

  const past = await prisma.episode.findFirst({
    where: { status: "PAST" },
    orderBy: { episodeNumber: "desc" },
  });
  return past?.id ?? null;
}
