/*
  Warnings:

  - You are about to drop the `employee_daily_meal_status` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SubsidyType" AS ENUM ('NORMAL', 'SPECIAL');

-- CreateEnum
CREATE TYPE "SubsidyPolicy" AS ENUM ('DEFAULT', 'FULL_COMPANY');

-- DropForeignKey
ALTER TABLE "employee_daily_meal_status" DROP CONSTRAINT "employee_daily_meal_status_employeeId_fkey";

-- DropIndex
DROP INDEX "transactions_employeeId_menu_session_transactionDate_key";

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "subsidyType" "SubsidyType" NOT NULL DEFAULT 'NORMAL';

-- AlterTable
ALTER TABLE "subsidy_config" ADD COLUMN     "policy" "SubsidyPolicy" NOT NULL DEFAULT 'DEFAULT';

-- DropTable
DROP TABLE "employee_daily_meal_status";

-- CreateTable
CREATE TABLE "employee_session_status" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "session" "mealType" NOT NULL,
    "mealConsumed" INTEGER NOT NULL DEFAULT 0,
    "drinkConsumed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "employee_session_status_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_session_status_employeeId_date_session_key" ON "employee_session_status"("employeeId", "date", "session");

-- CreateIndex
CREATE INDEX "employees_subsidyType_Employee_number_idx" ON "employees"("subsidyType", "Employee_number");

-- CreateIndex
CREATE INDEX "employees_subsidyType_full_name_idx" ON "employees"("subsidyType", "full_name");

-- CreateIndex
CREATE INDEX "transactions_employeeId_menu_session_transactionDate_idx" ON "transactions"("employeeId", "menu_session", "transactionDate");

-- AddForeignKey
ALTER TABLE "employee_session_status" ADD CONSTRAINT "employee_session_status_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
