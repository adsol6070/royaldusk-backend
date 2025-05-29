import { Router } from "express";
import { blogController } from "../controllers";
import {
  validateCreateBlog,
  validateUpdateBlog,
  validateUpdateStatus,
  validateIDParam,
  validateCategoryIDParam,
} from "../validations/blog.validation";
import { deserializeUser, requireUser, requireRole} from "@repo/auth-middleware";
import config from "config";

import { createUploadImageMiddleware } from "@repo/middlewares/uploadImageMiddleware";
import { validateRequest } from "@repo/middlewares/validateRequest";

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

const upload = createUploadImageMiddleware({
  destinationFolder: "blog-thumbnails",
});

// Protected routes
router.post(
  "/",
  deserializeUser(excludedFields, publicKey),
  requireUser,
  requireRole(["admin"]),
  upload.single("thumbnail"),
  validateCreateBlog,
  validateRequest,
  blogController.createBlog
);

router.patch(
  "/:id",
  deserializeUser(excludedFields, publicKey),
  requireUser,
  requireRole(["admin"]),
  upload.single("thumbnail"),
  validateUpdateBlog,
  validateRequest,
  blogController.updateBlog
);

router.delete(
  "/:id",
  deserializeUser(excludedFields, publicKey),
  requireUser,
  requireRole(["admin"]),
  validateIDParam,
  validateRequest,
  blogController.deleteBlog
);

router.patch(
  "/:id/status",
  deserializeUser(excludedFields, publicKey),
  requireUser,
  requireRole(["admin"]),
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
