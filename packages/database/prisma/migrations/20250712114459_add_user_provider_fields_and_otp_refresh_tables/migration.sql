-- CreateEnum
CREATE TYPE "OtpType" AS ENUM ('email', 'phone');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" VARCHAR(20),
ADD COLUMN     "profile_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "provider" VARCHAR(20) NOT NULL DEFAULT 'email',
ADD COLUMN     "provider_id" VARCHAR(255);

-- CreateTable
CREATE TABLE "OtpVerification" (
    "id" VARCHAR(36) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "otp" VARCHAR(6) NOT NULL,
    "type" "OtpType" NOT NULL DEFAULT 'email',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_email_type" ON "OtpVerification"("email", "type");

-- CreateIndex
CREATE INDEX "idx_expires_at" ON "OtpVerification"("expires_at");

-- CreateIndex
CREATE INDEX "idx_user_id" ON "RefreshToken"("user_id");

-- CreateIndex
CREATE INDEX "idx_token_hash" ON "RefreshToken"("token_hash");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
