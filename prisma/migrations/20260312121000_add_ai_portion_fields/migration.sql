-- AlterTable
ALTER TABLE "meal_items" ADD COLUMN     "containerSize" TEXT,
ADD COLUMN     "aiEstimatedCount" DOUBLE PRECISION,
ADD COLUMN     "aiEstimatedWeightGrams" DOUBLE PRECISION;
