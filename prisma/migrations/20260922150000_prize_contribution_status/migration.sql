-- AlterEnum
CREATE TYPE "PrizeContributionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "PrizeContribution"
ADD COLUMN "status" "PrizeContributionStatus" NOT NULL DEFAULT 'APPROVED';

-- CreateIndex
CREATE INDEX "PrizeContribution_status_idx" ON "PrizeContribution"("status");
