/*
  Warnings:

  - The primary key for the `PackageItineraryOnPackage` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "PackageItineraryOnPackage" DROP CONSTRAINT "PackageItineraryOnPackage_pkey",
ADD CONSTRAINT "PackageItineraryOnPackage_pkey" PRIMARY KEY ("packageId", "itineraryId", "day");
