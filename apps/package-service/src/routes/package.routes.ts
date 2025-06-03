import { Router } from "express";
import { packageController } from "../controllers";
import {
  validateCreatePackage,
  validateUpdatePackage,
  validateIDParam,
  validateUpdateAvailability,
  validateCategoryIDParam,
  validatePackageLocationIDParam
} from "../validations/package.validation";

import { createUploadImageMiddleware } from "@repo/middlewares/uploadImageMiddleware";
import { validateRequest } from "@repo/middlewares/validateRequest";

const router = Router();

const upload = createUploadImageMiddleware({
  destinationFolder: "package-thumbnails",
});

router.post(
  "/",
  upload.single("imageUrl"),
  validateCreatePackage,
  validateRequest,
  packageController.createPackage
);

router.get(
  "/:id",
  validateIDParam,
  validateRequest,
  packageController.getPackageByID
);

router.get(
  "/category/:categoryID",
  validateCategoryIDParam,
  validateRequest,
  packageController.getPackagesByCategoryID
);

router.get(
  "/location/:locationId",
  validatePackageLocationIDParam,
  validateRequest,
  packageController.getPackagesByLocationID
);

router.get("/", packageController.getAllPackages);

router.patch(
  "/:id/availability",
  validateUpdateAvailability,
  validateRequest,
  packageController.updatePackageAvailability
);

router.patch(
  "/:id",
  upload.single("imageUrl"),
  validateUpdatePackage,
  validateRequest,
  packageController.updatePackage
);

router.delete(
  "/:id",
  validateIDParam,
  validateRequest,
  packageController.deletePackage
);

export default router;
