-- AlterTable
ALTER TABLE "User" ALTER COLUMN "displayName" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "name" TEXT;
