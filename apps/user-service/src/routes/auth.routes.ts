import { Router } from "express";
import { authController } from "../controllers";
import {
  validateSendOTP,
  validateVerifyOTP,
  validateCompleteProfile,
  validateGoogleLogin,
  validateAppleLogin,
  validateRefreshToken,
} from "../validations/auth.validation";
import { validateRequest } from "../middlewares/validateRequest";
import { validateTemporaryToken } from "../middlewares/auth.middleware";
import { deserializeUser, requireUser } from "@repo/auth-middleware";
import config from "config";
import { otpRateLimit, verificationRateLimit } from "../middlewares/rateLimit";

const router = Router();

const excludedFields = [
  "password",
  "verified",
  "verificationCode",
  "passwordResetAt",
  "passwordResetToken",
];

const publicKey = Buffer.from(
  config.get<string>("accessTokenPublicKey"),
  "base64"
).toString("ascii");

// ==================== SIMPLIFIED EMAIL AUTH ====================
router.post(
  "/send-otp",
  otpRateLimit,
  validateSendOTP,
  validateRequest,
  authController.sendOTP
);

router.post(
  "/verify-otp",
  verificationRateLimit,
  validateVerifyOTP,
  validateRequest,
  authController.verifyOTP
);

router.post(
  "/complete-profile",
  validateCompleteProfile,
  validateRequest,
  // validateTemporaryToken,
  authController.completeProfile
);

// ==================== SOCIAL LOGIN ====================
router.post(
  "/google",
  validateGoogleLogin,
  validateRequest,
  authController.googleLogin
);

router.post(
  "/apple",
  validateAppleLogin,
  validateRequest,
  authController.appleLogin
);

// ==================== TOKEN MANAGEMENT ====================
router.post(
  "/refresh",
  validateRefreshToken,
  validateRequest,
  authController.refreshToken
);

router.post(
  "/logout",
  deserializeUser(excludedFields, publicKey),
  requireUser,
  authController.logout
);

// ==================== USER PROFILE ====================
router.get(
  "/profile",
  deserializeUser(excludedFields, publicKey),
  requireUser,
  authController.getProfile
);

export default router;
