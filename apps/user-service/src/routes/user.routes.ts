import express from "express";
import { deserializeUser, requireUser } from "@repo/auth-middleware";
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

router.get("/", userController.getAllUsers);

router.get("/:id", userController.getUserById);

router.patch("/:id", userController.updateUserById);

router.delete("/:id", userController.deleteUserById);

export default router;
