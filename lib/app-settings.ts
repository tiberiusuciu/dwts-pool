import "server-only";

import { prisma } from "@/lib/prisma";
import type { PrizeContributionRow } from "@/lib/prize-pool";

export const APP_SETTINGS_ID = "default";

export {
  formatPrizePool,
  parseDollarAmount,
  contributorLabel,
  type PrizeContributionRow,
} from "@/lib/prize-pool";

async function syncPrizePoolTotal() {
  const aggregate = await prisma.prizeContribution.aggregate({
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

export async function addPrizeContribution(input: {
  amountCents: number;
  userId?: string | null;
  guestName?: string | null;
  note?: string | null;
}): Promise<number> {
  await prisma.prizeContribution.create({
    data: {
      amountCents: input.amountCents,
      userId: input.userId || null,
      guestName: input.guestName?.trim() || null,
      note: input.note?.trim() || null,
    },
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
