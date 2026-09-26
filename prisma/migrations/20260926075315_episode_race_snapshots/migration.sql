-- DropIndex
DROP INDEX "User_rootingForCoupleId_idx";

-- AlterTable
ALTER TABLE "AppSettings" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "EpisodeRaceSnapshot" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "scoredCount" INTEGER NOT NULL,
    "pointsByUser" JSONB NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EpisodeRaceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EpisodeRaceSnapshot_episodeId_idx" ON "EpisodeRaceSnapshot"("episodeId");

-- CreateIndex
CREATE UNIQUE INDEX "EpisodeRaceSnapshot_episodeId_scoredCount_key" ON "EpisodeRaceSnapshot"("episodeId", "scoredCount");

-- AddForeignKey
ALTER TABLE "EpisodeRaceSnapshot" ADD CONSTRAINT "EpisodeRaceSnapshot_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
