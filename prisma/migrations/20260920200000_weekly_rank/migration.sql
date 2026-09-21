-- AlterEnum
ALTER TYPE "PredictionKind" ADD VALUE IF NOT EXISTS 'WEEKLY_RANK';

-- AlterTable
ALTER TABLE "Prediction" ADD COLUMN IF NOT EXISTS "predictedRank" INTEGER;

-- Drop legacy numeric weekly score predictions
DELETE FROM "Prediction" WHERE "kind" = 'WEEKLY_SCORE';
