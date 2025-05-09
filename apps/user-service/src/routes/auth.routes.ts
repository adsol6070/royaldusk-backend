import { Router } from "express";
import { authController } from "../controllers";
import {
  validateLogin,
  validateRegistration,
} from "../validations/user.validation";
import { validateRequest } from "../middlewares/validateRequest";
import { deserializeUser, requireUser } from "@repo/auth-middleware";

const router = Router();

const excludedFields = [
  "password",
  "verified",
  "verificationCode",
  "passwordResetAt",
  "passwordResetToken",
];

router.post(
  "/register",
  validateRegistration,
  validateRequest,
  authController.register
);

router.post("/login", validateLogin, validateRequest, authController.login);

router.post(
  "/logout",
  deserializeUser(excludedFields),
  requireUser,
  authController.logout
);

export default router;
