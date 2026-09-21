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
  /** coupleId → predicted rank (1 = highest) */
  ranks: Record<string, number>;
  elimCorrect: boolean;
  rankDistance: number | null;
  isRankLeader: boolean;
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
  players: Omit<
    BreakdownPlayer,
    "elimCorrect" | "rankDistance" | "isRankLeader"
  >[],
  results: LiveResultRow[],
  couples: BreakdownCouple[],
): BreakdownPlayer[] {
  const eliminatedIds = new Set(
    results.filter((r) => r.isEliminated).map((r) => r.coupleId),
  );

  const scored = results
    .filter((r) => r.judgeScore != null)
    .sort((a, b) => {
      const diff = (b.judgeScore ?? 0) - (a.judgeScore ?? 0);
      if (diff !== 0) return diff;
      const an =
        couples.find((c) => c.id === a.coupleId)?.celebrityName ?? "";
      const bn =
        couples.find((c) => c.id === b.coupleId)?.celebrityName ?? "";
      return an.localeCompare(bn);
    });
  const actualRanks = new Map(
    scored.map((r, i) => [r.coupleId, i + 1] as const),
  );
  const n = actualRanks.size;

  const withMeta = players.map((player) => {
    const elimCorrect =
      eliminatedIds.size > 0 &&
      player.eliminatedCoupleId != null &&
      eliminatedIds.has(player.eliminatedCoupleId);

    let rankDistance: number | null = null;
    if (n > 0 && Object.keys(player.ranks).length > 0) {
      let total = 0;
      let count = 0;
      for (const [coupleId, actualRank] of actualRanks) {
        const predicted = player.ranks[coupleId];
        if (predicted == null) continue;
        total += Math.abs(predicted - actualRank);
        count += 1;
      }
      rankDistance = count > 0 ? total : null;
    }

    return { ...player, elimCorrect, rankDistance, isRankLeader: false };
  });

  const distances = withMeta
    .map((p) => p.rankDistance)
    .filter((e): e is number => e != null);
  const best = distances.length > 0 ? Math.min(...distances) : null;

  return withMeta.map((p) => ({
    ...p,
    isRankLeader: best != null && p.rankDistance === best,
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
        in: [PredictionKind.WEEKLY_ELIMINATION, PredictionKind.WEEKLY_RANK],
      },
      userId: { in: users.map((u) => u.id) },
    },
  });

  const byUser = new Map<
    string,
    { eliminatedCoupleId: string | null; ranks: Record<string, number> }
  >();

  for (const user of users) {
    byUser.set(user.id, { eliminatedCoupleId: null, ranks: {} });
  }

  for (const pred of predictions) {
    const bucket = byUser.get(pred.userId);
    if (!bucket) continue;
    if (pred.kind === PredictionKind.WEEKLY_ELIMINATION) {
      bucket.eliminatedCoupleId = pred.predictedEliminatedCoupleId;
    } else if (
      pred.kind === PredictionKind.WEEKLY_RANK &&
      pred.coupleId != null &&
      pred.predictedRank != null
    ) {
      bucket.ranks[pred.coupleId] = pred.predictedRank;
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
        ranks: bucket.ranks,
      };
    }),
    results,
    couples,
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
  const upcoming = await prisma.episode.findFirst({
    where: { status: "UPCOMING" },
    orderBy: { episodeNumber: "asc" },
  });
  if (upcoming) return upcoming.id;

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
