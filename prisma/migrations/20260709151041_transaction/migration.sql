/*
  Warnings:

  - You are about to drop the column `company_share` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `employee_share` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `menu_item_id` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `menu_price` on the `transactions` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_menu_item_id_fkey";

-- DropIndex
DROP INDEX "transactions_cashierId_idx";

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "company_share",
DROP COLUMN "employee_share",
DROP COLUMN "menu_item_id",
DROP COLUMN "menu_price";

-- CreateTable
CREATE TABLE "transaction_items" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "menu_item_id" TEXT NOT NULL,
    "menu_price" DOUBLE PRECISION NOT NULL,
    "employee_share" DOUBLE PRECISION NOT NULL,
    "company_share" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transaction_items_transactionId_idx" ON "transaction_items"("transactionId");

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_menu_item_id_fkey" FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
