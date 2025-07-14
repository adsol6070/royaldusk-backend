import { Router } from "express";
import wishlistRoutes from "./wishlist.routes";

const router = Router();

router.use("/wishlist", wishlistRoutes);

export default router;
