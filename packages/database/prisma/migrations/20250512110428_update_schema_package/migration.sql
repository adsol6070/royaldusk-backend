/*
  Warnings:

  - You are about to drop the column `bookingPolicy` on the `Package` table. All the data in the column will be lost.
  - You are about to drop the column `cancellationPolicy` on the `Package` table. All the data in the column will be lost.
  - You are about to drop the column `paymentTerms` on the `Package` table. All the data in the column will be lost.
  - You are about to drop the column `visaDetails` on the `Package` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Package" DROP COLUMN "bookingPolicy",
DROP COLUMN "cancellationPolicy",
DROP COLUMN "paymentTerms",
DROP COLUMN "visaDetails",
ADD COLUMN     "policyID" TEXT;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_policyID_fkey" FOREIGN KEY ("policyID") REFERENCES "PackagePolicy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
