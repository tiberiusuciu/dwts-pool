-- AlterTable
ALTER TABLE "Episode" ADD COLUMN "expectedEliminationCount" INTEGER NOT NULL DEFAULT 1;

-- Backfill no-elim weeks
UPDATE "Episode" SET "expectedEliminationCount" = 0 WHERE "noElimination" = true;

-- AlterTable
ALTER TABLE "Prediction" ADD COLUMN "predictedEliminatedCoupleIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "Prediction"
SET "predictedEliminatedCoupleIds" = ARRAY["predictedEliminatedCoupleId"]
WHERE "predictedEliminatedCoupleId" IS NOT NULL
  AND (cardinality("predictedEliminatedCoupleIds") = 0 OR "predictedEliminatedCoupleIds" IS NULL);

ALTER TABLE "Prediction" ALTER COLUMN "predictedEliminatedCoupleIds" SET NOT NULL;
ALTER TABLE "Prediction" ALTER COLUMN "predictedEliminatedCoupleIds" SET DEFAULT ARRAY[]::TEXT[];
