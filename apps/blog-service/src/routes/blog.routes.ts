import { Router } from "express";
import { blogController } from "../controllers";
import {
  validateCreateBlog,
  validateUpdateBlog,
  validateUpdateStatus,
  validateIDParam,
  validateCategoryIDParam,
} from "../validations/blog.validation";

import { createUploadImageMiddleware } from "@repo/middlewares/uploadImageMiddleware";
import { validateRequest } from "@repo/middlewares/validateRequest"

const router = Router();

const upload = createUploadImageMiddleware({
  destinationFolder: "blog-thumbnails",
});

router.post(
  "/",
  upload.single("thumbnail"),
  validateCreateBlog,
  validateRequest,
  blogController.createBlog
);

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

router.get("/", blogController.getAllBlogs);

router.get(
  "/author/:authorID",
  validateIDParam,
  validateRequest,
  blogController.getBlogsByAuthorID
);

router.patch(
  "/:id",
  upload.single("thumbnail"),
  validateUpdateBlog,
  validateRequest,
  blogController.updateBlog
);

router.delete(
  "/:id",
  validateIDParam,
  validateRequest,
  blogController.deleteBlog
);

router.patch(
  "/:id/status",
  validateUpdateStatus,
  validateRequest,
  blogController.updateBlogStatus
);

export default router;
