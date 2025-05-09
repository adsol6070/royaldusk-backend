import { Router } from "express";
import { blogController } from "../controllers";
import { validateRequest } from "../middlewares/validateRequest";
import { uploadImageMiddleware } from "../middlewares/uploadImageMiddleware";
uploadImageMiddleware;
import {
  validateCreateBlog,
  validateUpdateBlog,
  validateUpdateStatus,
  validateIDParam,
  validateCategoryIDParam,
} from "../validations/blog.validation";

const router = Router();

router.post(
  "/",
  uploadImageMiddleware.single("thumbnail"),
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
  uploadImageMiddleware.single("thumbnail"),
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
