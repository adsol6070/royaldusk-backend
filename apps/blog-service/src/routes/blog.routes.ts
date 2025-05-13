import { Router } from "express";
import { blogController } from "../controllers";
import { validateRequest } from "../middlewares/validateRequest";
import { uploadImageMiddleware } from "../middlewares/uploadImageMiddleware";
import {
  validateCreateBlog,
  validateUpdateBlog,
  validateUpdateStatus,
  validateIDParam,
  validateCategoryIDParam,
} from "../validations/blog.validation";
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

// Protected routes
router.post(
  "/",
  deserializeUser(excludedFields, publicKey),
  requireUser,
  uploadImageMiddleware.single("thumbnail"),
  validateCreateBlog,
  validateRequest,
  blogController.createBlog
);

router.patch(
  "/:id",
  deserializeUser(excludedFields, publicKey),
  requireUser,
  uploadImageMiddleware.single("thumbnail"),
  validateUpdateBlog,
  validateRequest,
  blogController.updateBlog
);

router.delete(
  "/:id",
  deserializeUser(excludedFields, publicKey),
  requireUser,
  validateIDParam,
  validateRequest,
  blogController.deleteBlog
);

router.patch(
  "/:id/status",
  deserializeUser(excludedFields, publicKey),
  requireUser,
  validateUpdateStatus,
  validateRequest,
  blogController.updateBlogStatus
);

// Public routes
router.get("/", blogController.getAllBlogs);

router.get(
  "/:id",
  validateIDParam,
  validateRequest,
  blogController.getBlogByID
);

router.get(
  "/category/:categoryID",
  validateCategoryIDParam,
  validateRequest,
  blogController.getBlogsByCategoryID
);

router.get(
  "/author/:authorID",
  validateIDParam,
  validateRequest,
  blogController.getBlogsByAuthorID
);

export default router;
