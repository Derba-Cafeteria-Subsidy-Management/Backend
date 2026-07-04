/*
  Warnings:

  - You are about to drop the column `department` on the `employees` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "employees_department_full_name_idx";

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "department",
ALTER COLUMN "photo" DROP NOT NULL,
ALTER COLUMN "fingerprint_id" DROP NOT NULL;
