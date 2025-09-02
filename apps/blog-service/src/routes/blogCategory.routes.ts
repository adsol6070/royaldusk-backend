import { Router } from "express";
import { blogCategoryController } from "../controllers";
import { validateRequest } from "@repo/middlewares/validateRequest";
import {
  validateCreateCategory,
  validateUpdateCategory,
  validateIDParam,
} from "../validations/blogCategory.validation";
import { deserializeUser, requireRole, requireUser } from "@repo/auth-middleware";
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

// Protected routes
router.post(
  "/",
  deserializeUser(excludedFields, publicKey),
  requireUser,
  requireRole(["SUPER_ADMIN", "ADMIN"]),
  validateCreateCategory,
  validateRequest,
  blogCategoryController.createCategory
);

router.patch(
  "/:id",
  deserializeUser(excludedFields, publicKey),
  requireUser,
  requireRole(["SUPER_ADMIN", "ADMIN"]),
  validateIDParam,
  validateUpdateCategory,
  validateRequest,
  blogCategoryController.updateCategory
);

router.delete(
  "/:id",
  deserializeUser(excludedFields, publicKey),
  requireUser,
  requireRole(["SUPER_ADMIN", "ADMIN"]),
  validateIDParam,
  validateRequest,
  blogCategoryController.deleteCategory
);

// Public routes
router.get(
  "/:id",
  validateIDParam,
  validateRequest,
  blogCategoryController.getCategoryByID
);

router.get("/", blogCategoryController.getAllCategories);

export default router;
