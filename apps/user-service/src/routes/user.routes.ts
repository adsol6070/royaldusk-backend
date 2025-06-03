import express from "express";
import { deserializeUser, requireUser, requireRole } from "@repo/auth-middleware";
import { userController } from "../controllers";
import config from "config";

const router = express.Router();

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

router.get("/me", userController.getMe);

router.get("/", requireRole(["admin"]), userController.getAllUsers);

router.get("/:id", requireRole(["admin"]), userController.getUserById);

router.patch("/:id", userController.updateUserById);

router.delete("/:id", requireRole(["admin"]), userController.deleteUserById);

export default router;
