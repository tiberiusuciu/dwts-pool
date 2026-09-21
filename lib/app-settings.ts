import { prisma } from "@/lib/prisma";

export const APP_SETTINGS_ID = "default";

type AppSettingsRow = {
  id: string;
  prizePoolCents: number;
  updatedAt: Date;
};

type AppSettingsClient = {
  upsert: (args: {
    where: { id: string };
    create: { id: string; prizePoolCents: number };
    update: { prizePoolCents?: number };
  }) => Promise<AppSettingsRow>;
};

export function formatPrizePool(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(dollars);
}

function getSettingsClient(): AppSettingsClient {
  const client = (prisma as unknown as { appSettings?: AppSettingsClient })
    .appSettings;
  if (!client) {
    throw new Error(
      "Prisma client is missing AppSettings. Run: pnpm exec prisma generate && pnpm exec prisma migrate deploy",
    );
  }
  return client;
}

export async function getAppSettings(): Promise<AppSettingsRow> {
  return getSettingsClient().upsert({
    where: { id: APP_SETTINGS_ID },
    create: { id: APP_SETTINGS_ID, prizePoolCents: 0 },
    update: {},
  });
}

export async function getPrizePoolCents(): Promise<number> {
  try {
    const settings = await getAppSettings();
    return settings.prizePoolCents;
  } catch {
    return 0;
  }
}

export async function setPrizePoolCents(
  prizePoolCents: number,
): Promise<AppSettingsRow> {
  return getSettingsClient().upsert({
    where: { id: APP_SETTINGS_ID },
    create: { id: APP_SETTINGS_ID, prizePoolCents },
    update: { prizePoolCents },
  });
}
