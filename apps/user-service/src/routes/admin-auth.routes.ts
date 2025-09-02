import { Router } from "express";
import adminAuthController from "../controllers/admin-auth.controller";
import {
  validateAdminRegistrationInit,
  validateAdminRegistrationComplete,
  validateAdminLogin,
  validateTwoFactorAuth,
  validateAdminRoleUpdate,
  validateAdminProfileUpdate,
  validateRefreshToken,
} from "../validations/admin-auth.validation";
import { validateRequest } from "../middlewares/validateRequest";
import {
  requireSuperAdmin,
  requireAdmin,
  validateAdminAuth,
} from "../middlewares/admin-auth.middleware";
import { deserializeUser } from "@repo/auth-middleware";
import config from "config";
import {
  adminRateLimit,
  sensitiveActionRateLimit,
} from "../middlewares/rateLimit";

const router = Router();

const excludedFields = [
  "password",
  "verificationCode",
  "passwordResetAt",
  "passwordResetToken",
];

const publicKey = Buffer.from(
  config.get<string>("accessTokenPublicKey"),
  "base64"
).toString("ascii");

// ==================== ADMIN REGISTRATION ====================

/**
 * POST /admin/auth/invite
 * Super Admin initiates admin registration
 */
router.post(
  "/invite",
  adminRateLimit,
  deserializeUser(excludedFields, publicKey),
  requireSuperAdmin,
  validateAdminRegistrationInit,
  validateRequest,
  adminAuthController.initiateAdminRegistration
);

/**
 * POST /admin/auth/complete-registration
 * Complete admin registration with invitation token
 */
router.post(
  "/complete-registration",
  adminRateLimit,
  validateAdminRegistrationComplete,
  validateRequest,
  adminAuthController.completeAdminRegistration
);

// ==================== ADMIN LOGIN ====================

/**
 * POST /admin/auth/login
 * Admin email/password login
 */
router.post(
  "/login",
  adminRateLimit,
  validateAdminLogin,
  validateRequest,
  adminAuthController.adminLogin
);

/**
 * POST /admin/auth/verify-2fa
 * Verify 2FA code during login
 */
router.post(
  "/verify-2fa",
  adminRateLimit,
  validateTwoFactorAuth,
  validateRequest,
  adminAuthController.verify2FA
);

// ==================== ADMIN MANAGEMENT ====================

/**
 * GET /admin/auth/admins
 * Get all admin users (Super Admin only)
 */
router.get(
  "/admins",
  deserializeUser(excludedFields, publicKey),
  requireSuperAdmin,
  adminAuthController.getAllAdmins
);

/**
 * PUT /admin/auth/admins/role
 * Update admin role (Super Admin only)
 */
router.put(
  "/admins/role",
  sensitiveActionRateLimit,
  deserializeUser(excludedFields, publicKey),
  requireSuperAdmin,
  validateAdminRoleUpdate,
  validateRequest,
  adminAuthController.updateAdminRole
);

/**
 * DELETE /admin/auth/admins/:adminId
 * Deactivate admin account (Super Admin only)
 */
router.delete(
  "/admins/:adminId",
  sensitiveActionRateLimit,
  deserializeUser(excludedFields, publicKey),
  requireSuperAdmin,
  adminAuthController.deactivateAdmin
);

// ==================== ADMIN PROFILE ====================

/**
 * GET /admin/auth/profile
 * Get admin profile
 */
router.get(
  "/profile",
  deserializeUser(excludedFields, publicKey),
  requireAdmin,
  adminAuthController.getAdminProfile
);

/**
 * PUT /admin/auth/profile
 * Update admin profile
 */
router.put(
  "/profile",
  deserializeUser(excludedFields, publicKey),
  requireAdmin,
  validateAdminProfileUpdate,
  validateRequest,
  adminAuthController.updateAdminProfile
);

/**
 * POST /admin/auth/enable-2fa
 * Enable two-factor authentication
 */
router.post(
  "/enable-2fa",
  deserializeUser(excludedFields, publicKey),
  requireAdmin,
  adminAuthController.enableTwoFactorAuth
);

/**
 * POST /admin/auth/disable-2fa
 * Disable two-factor authentication
 */
router.post(
  "/disable-2fa",
  sensitiveActionRateLimit,
  deserializeUser(excludedFields, publicKey),
  requireAdmin,
  validateTwoFactorAuth, // Require 2FA verification to disable
  validateRequest,
  adminAuthController.disableTwoFactorAuth
);

// ==================== ADMIN DASHBOARD STATS ====================

/**
 * GET /admin/auth/stats
 * Get admin dashboard statistics
 */
router.get(
  "/stats",
  deserializeUser(excludedFields, publicKey),
  requireAdmin,
  adminAuthController.getAdminStats
);

/**
 * GET /admin/auth/activity-logs
 * Get admin activity logs
 */
router.get(
  "/activity-logs",
  deserializeUser(excludedFields, publicKey),
  requireAdmin,
  adminAuthController.getActivityLogs
);

// ==================== TOKEN MANAGEMENT ====================

/**
 * POST /admin/auth/refresh
 * Refresh admin tokens
 */
router.post(
  "/refresh",
  validateRefreshToken,
  validateRequest,
  adminAuthController.refreshAdminTokens
);

/**
 * POST /admin/auth/logout
 * Admin logout
 */
router.post(
  "/logout",
  deserializeUser(excludedFields, publicKey),
  requireAdmin,
  adminAuthController.adminLogout
);

/**
 * POST /admin/auth/logout-all
 * Logout from all devices
 */
router.post(
  "/logout-all",
  deserializeUser(excludedFields, publicKey),
  requireAdmin,
  adminAuthController.logoutAllDevices
);

/**
 * GET /admin/auth/authors
 * Get all admin users for blog author selection (Admin+ only)
 */
router.get(
  "/authors",
  deserializeUser(excludedFields, publicKey),
  requireAdmin,
  adminAuthController.getBlogAuthors
);

export default router;
