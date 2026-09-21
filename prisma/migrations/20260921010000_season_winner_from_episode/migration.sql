-- AlterTable
ALTER TABLE "Prediction" ADD COLUMN "seasonWinnerFromEpisodeNumber" INTEGER;

-- Backfill existing season picks as week-1 locks so early players keep credit
UPDATE "Prediction"
SET "seasonWinnerFromEpisodeNumber" = 1
WHERE "kind" = 'SEASON_WINNER'
  AND "seasonWinnerCoupleId" IS NOT NULL
  AND "seasonWinnerFromEpisodeNumber" IS NULL;
