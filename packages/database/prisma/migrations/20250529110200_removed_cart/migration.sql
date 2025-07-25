/*
  Warnings:

  - You are about to drop the `Cart` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CartItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_userId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_cartId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_packageId_fkey";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "agreedToTerms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "guestNationality" TEXT,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "remarks" TEXT;

-- DropTable
DROP TABLE "Cart";

-- DropTable
DROP TABLE "CartItem";
