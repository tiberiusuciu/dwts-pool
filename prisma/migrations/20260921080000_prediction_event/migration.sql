-- CreateTable
CREATE TABLE "PredictionEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "episodeId" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PredictionEvent_userId_createdAt_idx" ON "PredictionEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PredictionEvent_userId_episodeId_createdAt_idx" ON "PredictionEvent"("userId", "episodeId", "createdAt");

-- AddForeignKey
ALTER TABLE "PredictionEvent" ADD CONSTRAINT "PredictionEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictionEvent" ADD CONSTRAINT "PredictionEvent_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
