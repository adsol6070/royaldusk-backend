/*
  Warnings:

  - Added the required column `tourAvailability` to the `Tour` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TourAvailability" AS ENUM ('Available', 'SoldOut', 'ComingSoon');

-- AlterTable
ALTER TABLE "Tour" ADD COLUMN     "tourAvailability" "TourAvailability" NOT NULL;
