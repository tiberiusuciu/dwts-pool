-- CreateTable
CREATE TABLE "PrizeContribution" (
    "id" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "userId" TEXT,
    "guestName" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrizeContribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrizeContribution_createdAt_idx" ON "PrizeContribution"("createdAt");

-- CreateIndex
CREATE INDEX "PrizeContribution_userId_idx" ON "PrizeContribution"("userId");

-- AddForeignKey
ALTER TABLE "PrizeContribution" ADD CONSTRAINT "PrizeContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve any manually set prize pool as a starting ledger row
INSERT INTO "PrizeContribution" ("id", "amountCents", "guestName", "note", "createdAt")
SELECT
  'seed_prior_prize_pool',
  "prizePoolCents",
  'Prior balance',
  'Imported from previous prize pool total',
  CURRENT_TIMESTAMP
FROM "AppSettings"
WHERE "id" = 'default' AND "prizePoolCents" > 0;
