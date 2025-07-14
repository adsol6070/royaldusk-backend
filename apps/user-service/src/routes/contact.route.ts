import express from "express";
import { contactController } from "../controllers";
import { validateContactMessage } from "../validations/contact.validation";
import { requireUser, requireRole, deserializeUser } from "@repo/auth-middleware";
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

router.get("/", requireRole(["admin"]), contactController.getAll);
router.get("/:id", requireRole(["admin"]), contactController.getById);
router.delete("/:id", requireRole(["admin"]), contactController.deleteById);

export default router;

