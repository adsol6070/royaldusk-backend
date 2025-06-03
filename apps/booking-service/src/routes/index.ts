import { Router } from "express";
import bookingRoutes from "./booking.routes";

const router = Router();

router.use("/booking", bookingRoutes);

export default router;
