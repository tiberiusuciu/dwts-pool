-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "rootingForCoupleId" TEXT;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_rootingForCoupleId_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_rootingForCoupleId_fkey"
      FOREIGN KEY ("rootingForCoupleId") REFERENCES "Couple"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "User_rootingForCoupleId_idx" ON "User"("rootingForCoupleId");
