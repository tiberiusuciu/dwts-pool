-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "prizePoolCents" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- Seed singleton row
INSERT INTO "AppSettings" ("id", "prizePoolCents", "updatedAt")
VALUES ('default', 0, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
