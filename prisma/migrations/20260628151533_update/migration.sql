/*
  Warnings:

  - A unique constraint covering the columns `[Employee_number]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Made the column `createdBy` on table `price_history` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'SYSTEM_SETTINGS_UPDATED';

-- AlterTable
ALTER TABLE "price_history" ALTER COLUMN "createdBy" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "Employee_number" TEXT;

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "fingerprintEnabled" BOOLEAN NOT NULL DEFAULT true,
    "employeeSearchEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_Employee_number_key" ON "users"("Employee_number");

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
