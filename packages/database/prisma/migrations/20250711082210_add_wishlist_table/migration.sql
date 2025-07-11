-- CreateEnum
CREATE TYPE "WishlistItemType" AS ENUM ('Package', 'Tour');

-- CreateEnum
CREATE TYPE "WishlistPriority" AS ENUM ('Low', 'Medium', 'High');

-- CreateTable
CREATE TABLE "wishlist_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemType" "WishlistItemType" NOT NULL,
    "packageId" TEXT,
    "tourId" TEXT,
    "notes" TEXT,
    "priority" "WishlistPriority" NOT NULL DEFAULT 'Medium',
    "isNotified" BOOLEAN NOT NULL DEFAULT false,
    "notificationsSent" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "priceWhenAdded" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wishlist_items_userId_itemType_idx" ON "wishlist_items"("userId", "itemType");

-- CreateIndex
CREATE INDEX "wishlist_items_userId_createdAt_idx" ON "wishlist_items"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "wishlist_items_userId_lastViewedAt_idx" ON "wishlist_items"("userId", "lastViewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_items_userId_packageId_key" ON "wishlist_items"("userId", "packageId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_items_userId_tourId_key" ON "wishlist_items"("userId", "tourId");

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
