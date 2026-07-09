/*
  Warnings:

  - The values [Drink] on the enum `FoodType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FoodType_new" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'DRINK');
ALTER TABLE "menu_items" ALTER COLUMN "mealtype" TYPE "FoodType_new" USING ("mealtype"::text::"FoodType_new");
ALTER TYPE "FoodType" RENAME TO "FoodType_old";
ALTER TYPE "FoodType_new" RENAME TO "FoodType";
DROP TYPE "public"."FoodType_old";
COMMIT;
