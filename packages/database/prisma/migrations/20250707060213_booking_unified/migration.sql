/*
  Warnings:

  - You are about to drop the `BookingItem` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `serviceData` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serviceId` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serviceType` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BookingServiceType" AS ENUM ('Package', 'Tour', 'Hotel', 'Activity', 'Transport');

-- DropForeignKey
ALTER TABLE "BookingItem" DROP CONSTRAINT "BookingItem_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "BookingItem" DROP CONSTRAINT "BookingItem_packageId_fkey";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "serviceData" JSONB NOT NULL,
ADD COLUMN     "serviceId" TEXT NOT NULL,
ADD COLUMN     "serviceType" "BookingServiceType" NOT NULL;

-- DropTable
DROP TABLE "BookingItem";
