/*
  Warnings:

  - A unique constraint covering the columns `[providerRefId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "cardBrand" TEXT,
ADD COLUMN     "cardLast4" TEXT,
ADD COLUMN     "chargeId" TEXT,
ADD COLUMN     "failureCode" TEXT,
ADD COLUMN     "failureMessage" TEXT,
ADD COLUMN     "receiptUrl" TEXT,
ADD COLUMN     "refunded" BOOLEAN DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerRefId_key" ON "Payment"("providerRefId");
