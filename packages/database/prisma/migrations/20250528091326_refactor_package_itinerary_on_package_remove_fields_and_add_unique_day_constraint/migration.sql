/*
  Warnings:

  - The primary key for the `PackageItineraryOnPackage` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `description` on the `PackageItineraryOnPackage` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `PackageItineraryOnPackage` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PackageItineraryOnPackage" DROP CONSTRAINT "PackageItineraryOnPackage_pkey",
DROP COLUMN "description",
DROP COLUMN "title",
ADD CONSTRAINT "PackageItineraryOnPackage_pkey" PRIMARY KEY ("packageId", "day");
