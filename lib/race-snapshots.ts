import { EpisodeStatus, PredictionKind } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { scoreEpisodeFromData } from "@/lib/score-episode";

/** Episodes 1–2 are display-only for the season chart (always 0 contribution). */
const ZERO_CHART_EPISODES = new Set([1, 2]);

async function getSeasonWinnerCoupleId(): Promise<string | null> {
  const active = await prisma.couple.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });
  return active.length === 1 ? active[0]!.id : null;
}

export type RacePlayer = {
  userId: string;
  displayName: string;
};

export type RaceSeriesPoint = {
  /** X value: 0 = season start; else episodeNumber or scoredCount */
  x: number;
  label: string;
  /** userId → points at this step */
  pointsByUser: Record<string, number>;
};

export type RaceChartData = {
  mode: "all-time" | "episode";
  episodeId?: string;
  episodeNumber?: number;
  title?: string;
  projected: boolean;
  players: RacePlayer[];
  points: RaceSeriesPoint[];
};

function asPointsMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

export async function captureEpisodeRaceSnapshot(
  episodeId: string,
): Promise<{ scoredCount: number } | null> {
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    include: { actualResults: true },
  });
  if (!episode) return null;

  const scoredCount = episode.actualResults.filter(
    (r) => r.judgeScore != null,
  ).length;

  await prisma.episodeRaceSnapshot.deleteMany({
    where: { episodeId, scoredCount: { gt: scoredCount } },
  });

  const [users, couples, activeWinnerCoupleId] = await Promise.all([
    prisma.user.findMany({
      where: { displayName: { not: null } },
      select: { id: true, displayName: true },
    }),
    prisma.couple.findMany({ select: { id: true, celebrityName: true } }),
    getSeasonWinnerCoupleId(),
  ]);

  const pointsByUser: Record<string, number> = {};
  if (scoredCount === 0) {
    for (const user of users) pointsByUser[user.id] = 0;
  } else {
    const allPredictions = await prisma.prediction.findMany({
      where: {
        userId: { in: users.map((u) => u.id) },
        kind: {
          in: [
            PredictionKind.SEASON_WINNER,
            PredictionKind.WEEKLY_ELIMINATION,
            PredictionKind.WEEKLY_RANK,
          ],
        },
      },
    });

    for (const user of users) {
      const preds = allPredictions.filter(
        (p) =>
          p.userId === user.id &&
          (p.kind === PredictionKind.SEASON_WINNER ||
            p.episodeId === episodeId),
      );
      const breakdown = scoreEpisodeFromData({
        episode,
        results: episode.actualResults,
        predictions: preds,
        couples,
        activeWinnerCoupleId: episode.isFinale ? activeWinnerCoupleId : null,
      });
      pointsByUser[user.id] = breakdown.total;
    }
  }

  await prisma.episodeRaceSnapshot.upsert({
    where: {
      episodeId_scoredCount: { episodeId, scoredCount },
    },
    create: {
      episodeId,
      scoredCount,
      pointsByUser,
    },
    update: {
      pointsByUser,
      capturedAt: new Date(),
    },
  });

  return { scoredCount };
}

export async function getEpisodeRaceSeries(
  episodeId: string,
): Promise<RaceChartData | null> {
  const [episode, snapshots, users] = await Promise.all([
    prisma.episode.findUnique({
      where: { id: episodeId },
      select: {
        id: true,
        episodeNumber: true,
        title: true,
        status: true,
      },
    }),
    prisma.episodeRaceSnapshot.findMany({
      where: { episodeId },
      orderBy: { scoredCount: "asc" },
    }),
    prisma.user.findMany({
      where: { displayName: { not: null } },
      select: { id: true, displayName: true },
      orderBy: { displayName: "asc" },
    }),
  ]);

  if (!episode) return null;

  const isLive = episode.status === EpisodeStatus.LIVE;
  // LIVE episodes always show a race chart (baseline at 0 until scores land).
  // Past episodes only if we captured mid-night snapshots.
  if (!isLive && snapshots.length === 0) return null;

  const players: RacePlayer[] = users.map((u) => ({
    userId: u.id,
    displayName: u.displayName ?? "Player",
  }));

  const zero: Record<string, number> = {};
  for (const p of players) zero[p.userId] = 0;

  const scoredSnapshots = snapshots.filter((s) => s.scoredCount > 0);
  const points: RaceSeriesPoint[] = [
    { x: 0, label: "0", pointsByUser: { ...zero } },
    ...scoredSnapshots.map((s) => ({
      x: s.scoredCount,
      label: String(s.scoredCount),
      pointsByUser: asPointsMap(s.pointsByUser),
    })),
  ];

  return {
    mode: "episode",
    episodeId: episode.id,
    episodeNumber: episode.episodeNumber,
    title: episode.title,
    projected: isLive,
    players,
    points,
  };
}

/**
 * Cumulative season chart: start at 0; Ep 1–2 contribute 0; Ep 3+ add real finals.
 */
export async function getSeasonCumulativeSeries(): Promise<RaceChartData> {
  const [users, episodes, couples, activeWinnerCoupleId] = await Promise.all([
    prisma.user.findMany({
      where: { displayName: { not: null } },
      select: { id: true, displayName: true },
      orderBy: { displayName: "asc" },
    }),
    prisma.episode.findMany({
      where: {
        status: { in: [EpisodeStatus.PAST, EpisodeStatus.LIVE] },
        actualResults: { some: {} },
      },
      include: { actualResults: true },
      orderBy: { episodeNumber: "asc" },
    }),
    prisma.couple.findMany({ select: { id: true, celebrityName: true } }),
    getSeasonWinnerCoupleId(),
  ]);

  const players: RacePlayer[] = users.map((u) => ({
    userId: u.id,
    displayName: u.displayName ?? "Player",
  }));

  const allPredictions = await prisma.prediction.findMany({
    where: {
      userId: { in: users.map((u) => u.id) },
      kind: {
        in: [
          PredictionKind.SEASON_WINNER,
          PredictionKind.WEEKLY_ELIMINATION,
          PredictionKind.WEEKLY_RANK,
        ],
      },
    },
  });

  const zero: Record<string, number> = {};
  for (const p of players) zero[p.userId] = 0;

  const points: RaceSeriesPoint[] = [
    { x: 0, label: "Start", pointsByUser: { ...zero } },
  ];

  const cumulative = { ...zero };
  let anyLive = false;

  for (const episode of episodes) {
    if (episode.status === EpisodeStatus.LIVE) anyLive = true;

    for (const user of users) {
      let epPts = 0;
      if (!ZERO_CHART_EPISODES.has(episode.episodeNumber)) {
        const preds = allPredictions.filter(
          (p) =>
            p.userId === user.id &&
            (p.kind === PredictionKind.SEASON_WINNER ||
              p.episodeId === episode.id),
        );
        epPts = scoreEpisodeFromData({
          episode,
          results: episode.actualResults,
          predictions: preds,
          couples,
          activeWinnerCoupleId: episode.isFinale
            ? activeWinnerCoupleId
            : null,
        }).total;
      }
      cumulative[user.id] = (cumulative[user.id] ?? 0) + epPts;
    }

    points.push({
      x: episode.episodeNumber,
      label: `E${episode.episodeNumber}`,
      pointsByUser: { ...cumulative },
    });
  }

  return {
    mode: "all-time",
    projected: anyLive,
    players,
    points,
  };
}

export async function getLiveEpisodeRaceIfAny(): Promise<RaceChartData | null> {
  const live = await prisma.episode.findFirst({
    where: { status: EpisodeStatus.LIVE },
    select: { id: true },
  });
  if (!live) return null;
  return getEpisodeRaceSeries(live.id);
}
