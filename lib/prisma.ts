import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient();
}

/** Drop a stale singleton after `prisma generate` while next dev is still running. */
function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached?.prizeContribution) {
    return cached;
  }
  if (cached) {
    void cached.$disconnect().catch(() => undefined);
  }
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getPrismaClient();
