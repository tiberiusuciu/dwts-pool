-- CreateEnum
CREATE TYPE "PredictionKind" AS ENUM ('SEASON_WINNER', 'WEEKLY_ELIMINATION', 'WEEKLY_SCORE');

-- AlterTable
ALTER TABLE "Prediction" ADD COLUMN "kind" "PredictionKind";

-- Delete any legacy rows without kind (none expected)
DELETE FROM "Prediction" WHERE "kind" IS NULL;

-- Make required
ALTER TABLE "Prediction" ALTER COLUMN "kind" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Prediction_userId_kind_idx" ON "Prediction"("userId", "kind");

-- CreateIndex
CREATE INDEX "Prediction_userId_episodeId_kind_idx" ON "Prediction"("userId", "episodeId", "kind");

-- CreateIndex
CREATE INDEX "Prediction_userId_episodeId_coupleId_kind_idx" ON "Prediction"("userId", "episodeId", "coupleId", "kind");
