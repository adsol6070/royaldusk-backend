import { Router } from "express";
import blogRoutes from "./blog.routes";
import blogCategoryRoutes from "./blogCategory.routes";

const router = Router();

router.use("/blogs", blogRoutes);
router.use("/blog-categories", blogCategoryRoutes);

export default router;
