import { Router } from "express";
import { tourController } from "../controllers";
import { validateCreateTour, validateUpdateTour, validateUpdateAvailibility, validateTourIDParam } from "../validations/tour.validation";
import config from "config";
import { deserializeUser, requireUser, requireRole } from "@repo/auth-middleware";
import { validateRequest } from "@repo/middlewares/validateRequest";
import { createUploadImageMiddleware } from "@repo/middlewares/uploadImageMiddleware";

const router = Router();

const excludedFields = [
  "password",
  "verified",
  "verificationCode",
  "passwordResetAt",
  "passwordResetToken",
];

const publicKey = Buffer.from(config.get<string>("accessTokenPublicKey"), "base64").toString("ascii");
const upload = createUploadImageMiddleware({ 
  destinationFolder: "tour-thumbnails"
 });

router.post(
  "/",
  deserializeUser(excludedFields, publicKey),
  requireUser,
  requireRole(["SUPER_ADMIN", "ADMIN"]),
  upload.single("imageUrl"),
  validateCreateTour,
  validateRequest,
  tourController.createTour
);

router.patch(
  "/:id",
  deserializeUser(excludedFields, publicKey),
  requireUser,
  requireRole(["SUPER_ADMIN", "ADMIN"]),
  upload.single("imageUrl"),
  validateUpdateTour,
  validateRequest,
  tourController.updateTour
);

router.patch(
  "/:id/availability",
  deserializeUser(excludedFields, publicKey),
  requireUser,
  requireRole(["SUPER_ADMIN", "ADMIN"]),
  validateUpdateAvailibility,
  validateRequest,
  tourController.updateTourAvailibility
);

router.delete(
  "/:id",
  deserializeUser(excludedFields, publicKey),
  requireUser,
  requireRole(["SUPER_ADMIN", "ADMIN"]),
  validateTourIDParam,
  validateRequest,
  tourController.deleteTour
);

router.get("/", tourController.getAllTours);
router.get("/:id", validateTourIDParam, validateRequest, tourController.getTourByID);

export default router;