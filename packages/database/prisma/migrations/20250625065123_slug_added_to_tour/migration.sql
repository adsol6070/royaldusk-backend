/*
  Warnings:

  - Added the required column `slug` to the `Tour` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Tour" ADD COLUMN     "slug" TEXT NOT NULL;
