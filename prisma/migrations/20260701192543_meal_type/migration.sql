/*
  Warnings:

  - You are about to drop the column `description` on the `menu_items` table. All the data in the column will be lost.
  - Added the required column `mealtype` to the `menu_items` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FoodType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'Drink');

-- AlterTable
ALTER TABLE "menu_items" DROP COLUMN "description",
ADD COLUMN     "mealtype" "FoodType" NOT NULL;

-- CreateIndex
CREATE INDEX "employees_full_name_idx" ON "employees"("full_name");

CREATE UNIQUE INDEX unique_pending_correction
ON correction_requests ("transactionId")
WHERE status = 'PENDING';