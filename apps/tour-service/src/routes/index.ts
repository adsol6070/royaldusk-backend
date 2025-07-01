import { Router } from "express";
import tourRoutes from "./tour.routes";

const router = Router();

router.use("/tours", tourRoutes);

export default router;
