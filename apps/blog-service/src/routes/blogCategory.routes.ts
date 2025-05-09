import { Router } from "express";
import { blogCategoryController } from "../controllers";
import { validateRequest } from "../middlewares/validateRequest";
import {
  validateCreateCategory,
  validateUpdateCategory,
  validateIDParam,
} from "../validations/blogCategory.validation";

const router = Router();

router.post(
  "/",
  validateCreateCategory,
  validateRequest,
  blogCategoryController.createCategory
);

router.get(
  "/:id",
  validateIDParam,
  validateRequest,
  blogCategoryController.getCategoryByID
);

router.get("/", blogCategoryController.getAllCategories);

router.patch(
  "/:id",
  validateIDParam,
  validateUpdateCategory,
  validateRequest,
  blogCategoryController.updateCategory
);

router.delete(
  "/:id",
  validateIDParam,
  validateRequest,
  blogCategoryController.deleteCategory
);

export default router;
