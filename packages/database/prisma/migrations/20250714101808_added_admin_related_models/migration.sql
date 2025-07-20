-- CreateEnum
CREATE TYPE "AdminActionStatus" AS ENUM ('SUCCESS', 'FAILED', 'PENDING');

-- CreateEnum
CREATE TYPE "AdminInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('SUSPICIOUS_LOGIN', 'MULTIPLE_FAILED_LOGINS', 'ADMIN_PRIVILEGE_ESCALATION', 'UNAUTHORIZED_ACCESS_ATTEMPT', 'DATA_BREACH_ATTEMPT', 'UNUSUAL_ACTIVITY', 'ACCOUNT_COMPROMISE');

-- CreateEnum
CREATE TYPE "SecuritySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AdminNotificationType" AS ENUM ('SECURITY_ALERT', 'SYSTEM_UPDATE', 'USER_ACTIVITY', 'BOOKING_ALERT', 'PAYMENT_ISSUE', 'GENERAL');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OtpType" ADD VALUE 'EMAIL_VERIFICATION';
ALTER TYPE "OtpType" ADD VALUE 'PASSWORD_RESET';
ALTER TYPE "OtpType" ADD VALUE 'TWO_FACTOR';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RoleEnumType" ADD VALUE 'ADMIN';
ALTER TYPE "RoleEnumType" ADD VALUE 'MODERATOR';
ALTER TYPE "RoleEnumType" ADD VALUE 'SUPER_ADMIN';

-- AlterTable
ALTER TABLE "OtpVerification" ADD COLUMN     "admin_id" VARCHAR(36);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "deactivated_at" TIMESTAMP(3),
ADD COLUMN     "deactivated_by" TEXT,
ADD COLUMN     "last_activity" TIMESTAMP(3),
ADD COLUMN     "last_login" TIMESTAMP(3),
ADD COLUMN     "locked_until" TIMESTAMP(3),
ADD COLUMN     "login_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "admin_action_logs" (
    "id" VARCHAR(36) NOT NULL,
    "admin_id" VARCHAR(36) NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "target_user_id" VARCHAR(36),
    "target_type" VARCHAR(50),
    "target_id" VARCHAR(36),
    "details" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "status" "AdminActionStatus" NOT NULL DEFAULT 'SUCCESS',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_invitations" (
    "id" VARCHAR(36) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" "RoleEnumType" NOT NULL,
    "invited_by" VARCHAR(36) NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "status" "AdminInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" VARCHAR(36) NOT NULL,
    "admin_id" VARCHAR(36) NOT NULL,
    "session_token" VARCHAR(255) NOT NULL,
    "device_info" JSONB,
    "ip_address" INET NOT NULL,
    "location" VARCHAR(100),
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "logout_reason" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_settings" (
    "id" VARCHAR(36) NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50) NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "updated_by" VARCHAR(36) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" VARCHAR(36) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "ip_address" INET NOT NULL,
    "user_agent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "failure_reason" VARCHAR(100),
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_events" (
    "id" VARCHAR(36) NOT NULL,
    "event_type" "SecurityEventType" NOT NULL,
    "severity" "SecuritySeverity" NOT NULL DEFAULT 'MEDIUM',
    "user_id" VARCHAR(36),
    "ip_address" INET,
    "user_agent" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_by" VARCHAR(36),
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_notifications" (
    "id" VARCHAR(36) NOT NULL,
    "admin_id" VARCHAR(36) NOT NULL,
    "type" "AdminNotificationType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_health_logs" (
    "id" VARCHAR(36) NOT NULL,
    "component" VARCHAR(100) NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "response_time" INTEGER,
    "error_message" TEXT,
    "metadata" JSONB,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_health_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_admin_actions_admin" ON "admin_action_logs"("admin_id");

-- CreateIndex
CREATE INDEX "idx_admin_actions_target" ON "admin_action_logs"("target_user_id");

-- CreateIndex
CREATE INDEX "idx_admin_actions_action" ON "admin_action_logs"("action");

-- CreateIndex
CREATE INDEX "idx_admin_actions_created" ON "admin_action_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_admin_actions_target_resource" ON "admin_action_logs"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "idx_admin_invitations_email" ON "admin_invitations"("email");

-- CreateIndex
CREATE INDEX "idx_admin_invitations_inviter" ON "admin_invitations"("invited_by");

-- CreateIndex
CREATE INDEX "idx_admin_invitations_status" ON "admin_invitations"("status");

-- CreateIndex
CREATE INDEX "idx_admin_invitations_expires" ON "admin_invitations"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "admin_sessions_session_token_key" ON "admin_sessions"("session_token");

-- CreateIndex
CREATE INDEX "idx_admin_sessions_admin" ON "admin_sessions"("admin_id");

-- CreateIndex
CREATE INDEX "idx_admin_sessions_token" ON "admin_sessions"("session_token");

-- CreateIndex
CREATE INDEX "idx_admin_sessions_expires" ON "admin_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "idx_admin_sessions_active" ON "admin_sessions"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "admin_settings_key_key" ON "admin_settings"("key");

-- CreateIndex
CREATE INDEX "idx_admin_settings_category" ON "admin_settings"("category");

-- CreateIndex
CREATE INDEX "idx_admin_settings_key" ON "admin_settings"("key");

-- CreateIndex
CREATE INDEX "idx_login_attempts_email" ON "login_attempts"("email");

-- CreateIndex
CREATE INDEX "idx_login_attempts_ip" ON "login_attempts"("ip_address");

-- CreateIndex
CREATE INDEX "idx_login_attempts_time" ON "login_attempts"("attempted_at");

-- CreateIndex
CREATE INDEX "idx_login_attempts_email_time" ON "login_attempts"("email", "attempted_at");

-- CreateIndex
CREATE INDEX "idx_security_events_type" ON "security_events"("event_type");

-- CreateIndex
CREATE INDEX "idx_security_events_severity" ON "security_events"("severity");

-- CreateIndex
CREATE INDEX "idx_security_events_user" ON "security_events"("user_id");

-- CreateIndex
CREATE INDEX "idx_security_events_created" ON "security_events"("created_at");

-- CreateIndex
CREATE INDEX "idx_security_events_resolved" ON "security_events"("resolved");

-- CreateIndex
CREATE INDEX "idx_admin_notifications_admin" ON "admin_notifications"("admin_id");

-- CreateIndex
CREATE INDEX "idx_admin_notifications_type" ON "admin_notifications"("type");

-- CreateIndex
CREATE INDEX "idx_admin_notifications_read" ON "admin_notifications"("read");

-- CreateIndex
CREATE INDEX "idx_admin_notifications_created" ON "admin_notifications"("created_at");

-- CreateIndex
CREATE INDEX "idx_system_health_component" ON "system_health_logs"("component");

-- CreateIndex
CREATE INDEX "idx_system_health_status" ON "system_health_logs"("status");

-- CreateIndex
CREATE INDEX "idx_system_health_checked" ON "system_health_logs"("checked_at");

-- CreateIndex
CREATE INDEX "idx_admin_id" ON "OtpVerification"("admin_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_deactivated_by_fkey" FOREIGN KEY ("deactivated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_action_logs" ADD CONSTRAINT "admin_action_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_action_logs" ADD CONSTRAINT "admin_action_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_invitations" ADD CONSTRAINT "admin_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_settings" ADD CONSTRAINT "admin_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_notifications" ADD CONSTRAINT "admin_notifications_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
