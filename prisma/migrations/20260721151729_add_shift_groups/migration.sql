-- CreateEnum
CREATE TYPE "MenuAudience" AS ENUM ('EMPLOYEE', 'GUEST');

-- CreateEnum
CREATE TYPE "EmployeeType" AS ENUM ('NORMAL', 'SHIFT');

-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SlotHalf" AS ENUM ('FIRST_HALF', 'SECOND_HALF');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'EMPLOYEE_GROUP_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'EMPLOYEE_GROUP_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'EMPLOYEE_GROUP_STATUS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'GROUP_MEMBER_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE 'GROUP_MEMBER_REMOVED';
ALTER TYPE "AuditAction" ADD VALUE 'GROUP_MEMBER_MOVED';
ALTER TYPE "AuditAction" ADD VALUE 'SHIFT_SLOT_OVERRIDDEN';
ALTER TYPE "AuditAction" ADD VALUE 'EMPLOYEE_TYPE_CHANGED';

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "employeeType" "EmployeeType" NOT NULL DEFAULT 'NORMAL';

-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "audience" "MenuAudience" NOT NULL DEFAULT 'EMPLOYEE';

-- CreateTable
CREATE TABLE "guest_meal_items" (
    "id" TEXT NOT NULL,
    "guestTransactionId" TEXT NOT NULL,
    "menu_item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION NOT NULL,
    "company_share" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_meal_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_meal_transactions" (
    "id" TEXT NOT NULL,
    "invitedByEmployeeId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "menu_session" "mealType" NOT NULL,
    "transactionDate" DATE NOT NULL,
    "cashierId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_meal_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rotationOrder" INTEGER NOT NULL,
    "status" "GroupStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_group_members" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "employee_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_slots" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "half" "SlotHalf" NOT NULL,
    "groupId" TEXT NOT NULL,
    "isOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guest_meal_items_guestTransactionId_idx" ON "guest_meal_items"("guestTransactionId");

-- CreateIndex
CREATE INDEX "guest_meal_transactions_transactionDate_idx" ON "guest_meal_transactions"("transactionDate");

-- CreateIndex
CREATE INDEX "guest_meal_transactions_invitedByEmployeeId_idx" ON "guest_meal_transactions"("invitedByEmployeeId");

-- CreateIndex
CREATE INDEX "guest_meal_transactions_cashierId_idx" ON "guest_meal_transactions"("cashierId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_groups_name_key" ON "employee_groups"("name");

-- CreateIndex
CREATE INDEX "employee_groups_status_rotationOrder_idx" ON "employee_groups"("status", "rotationOrder");

-- CreateIndex
CREATE INDEX "employee_group_members_groupId_active_idx" ON "employee_group_members"("groupId", "active");

-- CreateIndex
CREATE INDEX "employee_group_members_employeeId_idx" ON "employee_group_members"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "employee_group_members_employeeId_active_key" ON "employee_group_members"("employeeId", "active");

-- CreateIndex
CREATE INDEX "shift_slots_date_idx" ON "shift_slots"("date");

-- CreateIndex
CREATE UNIQUE INDEX "shift_slots_date_half_key" ON "shift_slots"("date", "half");

-- AddForeignKey
ALTER TABLE "guest_meal_items" ADD CONSTRAINT "guest_meal_items_guestTransactionId_fkey" FOREIGN KEY ("guestTransactionId") REFERENCES "guest_meal_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_meal_items" ADD CONSTRAINT "guest_meal_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_meal_transactions" ADD CONSTRAINT "guest_meal_transactions_invitedByEmployeeId_fkey" FOREIGN KEY ("invitedByEmployeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_meal_transactions" ADD CONSTRAINT "guest_meal_transactions_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_group_members" ADD CONSTRAINT "employee_group_members_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_group_members" ADD CONSTRAINT "employee_group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "employee_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_slots" ADD CONSTRAINT "shift_slots_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "employee_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
