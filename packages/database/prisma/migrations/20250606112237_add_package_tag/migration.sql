-- CreateEnum
CREATE TYPE "PackageTag" AS ENUM ('Regular', 'Popular', 'Top');

-- AlterTable
ALTER TABLE "Package" ADD COLUMN     "tag" "PackageTag" NOT NULL DEFAULT 'Regular';
