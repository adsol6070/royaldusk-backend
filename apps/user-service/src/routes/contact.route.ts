import express from "express";
import { contactController } from "../controllers";
import { validateContactMessage } from "../validations/contact.validation";
import {
  requireUser,
  requireRole,
  deserializeUser,
} from "@repo/auth-middleware";
import config from "config";

const router = express.Router();

router.post("/submit", validateContactMessage, contactController.submit);

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
  contactController.getAll
);
router.get(
  "/:id",
  requireRole(["SUPER_ADMIN", "ADMIN"]),
  contactController.getById
);
router.delete(
  "/:id",
  requireRole(["SUPER_ADMIN", "ADMIN"]),
  contactController.deleteById
);

export default router;
