-- CreateEnum
CREATE TYPE "MenuItemStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "mealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER');

-- CreateEnum
CREATE TYPE "CorrectionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'MENU_ITEM_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'MENU_ITEM_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'MENU_ITEM_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'PRICE_HISTORY_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'create_transaction';
ALTER TYPE "AuditAction" ADD VALUE 'create_employee';
ALTER TYPE "AuditAction" ADD VALUE 'update_employee';
ALTER TYPE "AuditAction" ADD VALUE 'deactivate_employee';
ALTER TYPE "AuditAction" ADD VALUE 'activate_employee';
ALTER TYPE "AuditAction" ADD VALUE 'create_correction_request';
ALTER TYPE "AuditAction" ADD VALUE 'approve_correction';
ALTER TYPE "AuditAction" ADD VALUE 'reject_correction';
ALTER TYPE "AuditAction" ADD VALUE 'create_subsidy_config';
ALTER TYPE "AuditAction" ADD VALUE 'offline_sync_batch';

-- CreateTable
CREATE TABLE "menu_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "MenuItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "effctive_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "Employee_number" TEXT NOT NULL,
    "photo" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "fingerprint_id" TEXT NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "menu_item_id" TEXT NOT NULL,
    "menu_session" "mealType" NOT NULL,
    "menu_price" DOUBLE PRECISION NOT NULL,
    "employee_share" DOUBLE PRECISION NOT NULL,
    "company_share" DOUBLE PRECISION NOT NULL,
    "transactionDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cashierId" TEXT NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correction_requests" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "CorrectionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedById" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,

    CONSTRAINT "correction_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subsidy_config" (
    "id" TEXT NOT NULL,
    "company_share" DOUBLE PRECISION NOT NULL,
    "employee_share" DOUBLE PRECISION NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subsidy_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offline_sync_records" (
    "id" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "transactionId" TEXT,
    "cashierId" TEXT NOT NULL,
    "syncStatus" TEXT NOT NULL,
    "syncReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offline_sync_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_Employee_number_key" ON "employees"("Employee_number");

-- CreateIndex
CREATE UNIQUE INDEX "employees_fingerprint_id_key" ON "employees"("fingerprint_id");

-- CreateIndex
CREATE INDEX "employees_fingerprint_id_idx" ON "employees"("fingerprint_id");

-- CreateIndex
CREATE INDEX "employees_status_idx" ON "employees"("status");

-- CreateIndex
CREATE INDEX "transactions_transactionDate_idx" ON "transactions"("transactionDate");

-- CreateIndex
CREATE INDEX "transactions_cashierId_idx" ON "transactions"("cashierId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_employeeId_menu_session_transactionDate_key" ON "transactions"("employeeId", "menu_session", "transactionDate");

-- CreateIndex
CREATE INDEX "correction_requests_status_idx" ON "correction_requests"("status");

-- CreateIndex
CREATE INDEX "correction_requests_createdAt_idx" ON "correction_requests"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "offline_sync_records_localId_key" ON "offline_sync_records"("localId");

-- CreateIndex
CREATE INDEX "offline_sync_records_stationId_idx" ON "offline_sync_records"("stationId");

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offline_sync_records" ADD CONSTRAINT "offline_sync_records_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offline_sync_records" ADD CONSTRAINT "offline_sync_records_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
