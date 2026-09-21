import {
  CoupleStatus,
  EpisodeStatus,
  PredictionKind,
  type Couple,
  type Episode,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

/** Admin score entry bounds (official paddle totals). */
export const SCORE_MIN = 3;
export const SCORE_MAX = 30;
export const SCORE_DEFAULT = 18;

export type CoupleOption = Pick<Couple, "id" | "celebrityName" | "proName">;

export type UserPredictionState = {
  seasonWinnerCoupleId: string | null;
  seasonWinnerFromEpisodeNumber: number | null;
  eliminatedCoupleId: string | null;
  /** coupleId → rank (1 = highest expected score) */
  ranks: Record<string, number>;
};

const ET = "America/New_York";

/**
 * Episode.airDate is a calendar date stored as UTC midnight (YYYY-MM-DD).
 * Read the UTC Y-M-D — formatting in ET would shift it to the prior evening.
 */
function airCalendarDate(airDate: Date): string {
  const y = airDate.getUTCFullYear();
  const m = String(airDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(airDate.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Lock at 8:00pm America/New_York on the episode's air calendar day.
 */
export function getEpisodeLockAt(episode: Pick<Episode, "airDate">): Date {
  const day = airCalendarDate(episode.airDate);
  for (const offset of ["-04:00", "-05:00"] as const) {
    const candidate = new Date(`${day}T20:00:00.000${offset}`);
    const check = new Intl.DateTimeFormat("en-CA", {
      timeZone: ET,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(candidate);
    const y = check.find((p) => p.type === "year")?.value;
    const m = check.find((p) => p.type === "month")?.value;
    const d = check.find((p) => p.type === "day")?.value;
    const h = check.find((p) => p.type === "hour")?.value;
    if (`${y}-${m}-${d}` === day && h === "20") {
      return candidate;
    }
  }
  return new Date(`${day}T20:00:00.000-04:00`);
}

export function isEpisodeLocked(
  episode: Pick<Episode, "status" | "airDate">,
  now = new Date(),
) {
  if (episode.status !== EpisodeStatus.UPCOMING) return true;
  return now.getTime() >= getEpisodeLockAt(episode).getTime();
}

/** Countdown label from a lock instant (ms since epoch). */
export function formatLockCountdownFromMs(
  lockAtMs: number,
  nowMs = Date.now(),
): string {
  if (nowMs >= lockAtMs) return "Locked";
  const ms = lockAtMs - nowMs;
  const totalHours = Math.floor(ms / 3_600_000);
  const days = Math.floor(totalHours / 24);

  // ≥ 24h → days + hours
  if (days >= 1) {
    return `${days}d ${totalHours % 24}h`;
  }

  // < 24h → hours, minutes, seconds
  const hours = totalHours;
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  return `${hours}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
}

export function isLockUrgent(
  lockAtMs: number,
  nowMs = Date.now(),
): boolean {
  const remaining = lockAtMs - nowMs;
  return remaining > 0 && remaining < 12 * 3_600_000;
}

export function formatLockCountdown(
  episode: Pick<Episode, "airDate" | "status">,
  now = new Date(),
): string {
  if (isEpisodeLocked(episode, now)) return "Locked";
  return formatLockCountdownFromMs(getEpisodeLockAt(episode).getTime(), now.getTime());
}

export async function getPredictableEpisode() {
  return prisma.episode.findFirst({
    where: { status: EpisodeStatus.UPCOMING },
    orderBy: { episodeNumber: "asc" },
  });
}

/** Episode to feature on home / lock chip: LIVE night first, else next UPCOMING. */
export async function getFeaturedPredictionEpisode() {
  const live = await prisma.episode.findFirst({
    where: { status: EpisodeStatus.LIVE },
    orderBy: { episodeNumber: "asc" },
  });
  if (live) return live;
  return getPredictableEpisode();
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
          kind: PredictionKind.WEEKLY_RANK,
          episodeId,
        },
      ],
    },
  });

  const ranks: Record<string, number> = {};
  let seasonWinnerCoupleId: string | null = null;
  let seasonWinnerFromEpisodeNumber: number | null = null;
  let eliminatedCoupleId: string | null = null;

  for (const row of rows) {
    if (row.kind === PredictionKind.SEASON_WINNER) {
      seasonWinnerCoupleId = row.seasonWinnerCoupleId;
      seasonWinnerFromEpisodeNumber = row.seasonWinnerFromEpisodeNumber;
    } else if (row.kind === PredictionKind.WEEKLY_ELIMINATION) {
      eliminatedCoupleId = row.predictedEliminatedCoupleId;
    } else if (
      row.kind === PredictionKind.WEEKLY_RANK &&
      row.coupleId &&
      row.predictedRank != null
    ) {
      ranks[row.coupleId] = row.predictedRank;
    }
  }

  return {
    seasonWinnerCoupleId,
    seasonWinnerFromEpisodeNumber,
    eliminatedCoupleId,
    ranks,
  };
}

export function defaultRankOrder(couples: CoupleOption[]): string[] {
  return couples.map((c) => c.id);
}

export function clampScore(value: number) {
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, Math.round(value)));
}
