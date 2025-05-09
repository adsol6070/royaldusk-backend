import express from "express";
import { deserializeUser } from "../middlewares/deserializeUser";
import { requireUser } from "../middlewares/requireUser";
import { userController } from "../controllers";

const router = express.Router();

router.use(deserializeUser, requireUser);

router.get("/me", userController.getMeHandler);

export default router;
