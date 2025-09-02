import express from "express";
import { newsletterController } from "../controllers";
import {
  validateNewsletterSubscribe,
  validateUpdateSubscription,
} from "../validations/newsletter.validation";
import {
  requireUser,
  requireRole,
  deserializeUser,
} from "@repo/auth-middleware";
import config from "config";

const router = express.Router();

// Public
router.post(
  "/subscribe",
  validateNewsletterSubscribe,
  newsletterController.subscribe
);
router.post(
  "/update",
  validateUpdateSubscription,
  newsletterController.updateSubscription
);

// Admin
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

router.use(deserializeUser(excludedFields, publicKey), requireUser);

router.get(
  "/",
  requireRole(["SUPER_ADMIN", "ADMIN"]),
  newsletterController.getAll
);
router.get(
  "/:id",
  requireRole(["SUPER_ADMIN", "ADMIN"]),
  newsletterController.getById
);
router.delete(
  "/:id",
  requireRole(["SUPER_ADMIN", "ADMIN"]),
  newsletterController.deleteById
);

export default router;
