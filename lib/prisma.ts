import "server-only";

import { PrismaClient } from "@prisma/client";

/** Bump when Prisma schema fields change so dev HMR drops a stale client. */
const PRISMA_CLIENT_GEN = 3;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaClientGen?: number;
};

if (
  process.env.NODE_ENV !== "production" &&
  globalForPrisma.prisma &&
  globalForPrisma.prismaClientGen !== PRISMA_CLIENT_GEN
) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaClientGen = PRISMA_CLIENT_GEN;
}
