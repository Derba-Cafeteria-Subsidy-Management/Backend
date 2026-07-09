/*
  Warnings:

  - You are about to drop the column `transactionId` on the `correction_requests` table. All the data in the column will be lost.
  - Added the required column `transactionItemId` to the `correction_requests` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "correction_requests" DROP CONSTRAINT "correction_requests_transactionId_fkey";

-- DropIndex
DROP INDEX "correction_requests_status_transactionId_idx";

-- AlterTable
ALTER TABLE "correction_requests" DROP COLUMN "transactionId",
ADD COLUMN     "transactionItemId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "correction_requests_status_transactionItemId_idx" ON "correction_requests"("status", "transactionItemId");

-- AddForeignKey
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_transactionItemId_fkey" FOREIGN KEY ("transactionItemId") REFERENCES "transaction_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
