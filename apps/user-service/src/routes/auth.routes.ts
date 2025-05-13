import { Router } from "express";
import { authController } from "../controllers";
import {
  validateLogin,
  validateRegistration,
  validateVerifyEmail,
} from "../validations/user.validation";
import { validateRequest } from "../middlewares/validateRequest";
import { deserializeUser, requireUser } from "@repo/auth-middleware";
import config from "config";

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

router.post(
  "/register",
  validateRegistration,
  validateRequest,
  authController.register
);

router.post("/login", validateLogin, validateRequest, authController.login);

router.post(
  "/logout",
  deserializeUser(excludedFields, publicKey),
  requireUser,
  authController.logout
);

router.get(
  "/verify-email/:verificationCode",
  validateVerifyEmail,
  validateRequest,
  authController.verifyEmail
);

export default router;
