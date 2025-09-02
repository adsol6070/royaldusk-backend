import { Router } from "express";
import adminRoutes from "./admin-auth.routes";
import authRoutes from "./auth.routes";
// import userRoutes from "./user.routes";
import newsletterRoutes from "./newsletter.route";
import contactRoutes from "./contact.route";

const router = Router();

router.use("/admin/auth", adminRoutes)
router.use("/auth", authRoutes);
// router.use("/users", userRoutes);
router.use("/newsletter", newsletterRoutes);
router.use("/contact", contactRoutes);

export default router;
