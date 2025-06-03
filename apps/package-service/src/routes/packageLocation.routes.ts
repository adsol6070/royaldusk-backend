import { Router } from "express";
import { packageLocationController } from "../controllers";
import {
  validateCreateLocation,
  validateUpdateLocation,
  validateLocationIDParam,
} from "../validations/packageLocation.validation";

import { createUploadImageMiddleware } from "@repo/middlewares/uploadImageMiddleware";
import { validateRequest } from "@repo/middlewares/validateRequest";

const router = Router();

const upload = createUploadImageMiddleware({
  destinationFolder: "location-images",
});

// Create location
router.post(
  "/",
  upload.single("imageUrl"),
  validateCreateLocation,
  validateRequest,
  packageLocationController.createLocation
);

// Get single location
router.get(
  "/:id",
  validateLocationIDParam,
  validateRequest,
  packageLocationController.getLocationByID
);

// Get all locations
router.get("/", packageLocationController.getAllLocations);

// Update location
router.patch(
  "/:id",
  upload.single("imageUrl"),
  validateLocationIDParam,
  validateUpdateLocation,
  validateRequest,
  packageLocationController.updateLocation
);

// Delete location
router.delete(
  "/:id",
  validateLocationIDParam,
  validateRequest,
  packageLocationController.deleteLocation
);

export default router;
