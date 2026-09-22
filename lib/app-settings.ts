import "server-only";

import { PrizeContributionStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { PrizeContributionRow } from "@/lib/prize-pool";

export const APP_SETTINGS_ID = "default";

export {
  formatPrizePool,
  parseDollarAmount,
  contributorLabel,
  type PrizeContributionRow,
  type PrizeContributionStatus,
} from "@/lib/prize-pool";

async function syncPrizePoolTotal() {
  const aggregate = await prisma.prizeContribution.aggregate({
    where: { status: PrizeContributionStatus.APPROVED },
    _sum: { amountCents: true },
  });
  const prizePoolCents = aggregate._sum.amountCents ?? 0;
  await prisma.appSettings.upsert({
    where: { id: APP_SETTINGS_ID },
    create: { id: APP_SETTINGS_ID, prizePoolCents },
    update: { prizePoolCents },
  });
  return prizePoolCents;
}

export async function getPrizePoolCents(): Promise<number> {
  try {
    const settings = await prisma.appSettings.upsert({
      where: { id: APP_SETTINGS_ID },
      create: { id: APP_SETTINGS_ID, prizePoolCents: 0 },
      update: {},
    });
    return settings.prizePoolCents;
  } catch {
    return 0;
  }
}

export async function listPrizeContributions(): Promise<PrizeContributionRow[]> {
  const rows = await prisma.prizeContribution.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, displayName: true, email: true } },
    },
  });
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function listMyPrizeOffers(
  userId: string,
): Promise<PrizeContributionRow[]> {
  const rows = await prisma.prizeContribution.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, displayName: true, email: true } },
    },
  });
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function addPrizeContribution(input: {
  amountCents: number;
  userId?: string | null;
  guestName?: string | null;
  note?: string | null;
  status?: PrizeContributionStatus;
}): Promise<number> {
  const status = input.status ?? PrizeContributionStatus.APPROVED;
  await prisma.prizeContribution.create({
    data: {
      amountCents: input.amountCents,
      userId: input.userId || null,
      guestName: input.guestName?.trim() || null,
      note: input.note?.trim() || null,
      status,
    },
  });
  if (status === PrizeContributionStatus.APPROVED) {
    return syncPrizePoolTotal();
  }
  return getPrizePoolCents();
}

export async function setPrizeContributionStatus(
  id: string,
  status: PrizeContributionStatus,
): Promise<number> {
  await prisma.prizeContribution.update({
    where: { id },
    data: { status },
  });
  return syncPrizePoolTotal();
}

export async function removePrizeContribution(id: string): Promise<number> {
  await prisma.prizeContribution.delete({ where: { id } });
  return syncPrizePoolTotal();
}

export async function listPoolPlayers() {
  return prisma.user.findMany({
    where: { displayName: { not: null } },
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true, email: true },
  });
}
