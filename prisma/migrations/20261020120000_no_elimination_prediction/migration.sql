-- AlterTable
ALTER TABLE "Episode" ADD COLUMN "noElimination" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Prediction" ADD COLUMN "predictsNoElimination" BOOLEAN NOT NULL DEFAULT false;
