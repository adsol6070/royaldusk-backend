import { Router } from "express";
import { packageController } from "../controllers";
import {
  validateCreatePackage,
  validateUpdatePackage,
  validateIDParam,
  validateUpdateAvailability,
  validateCategoryIDParam,
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

router.get("/", packageController.getAllPackages);

router.patch(
  "/:id/availability",
  validateUpdateAvailability,
  validateRequest,
  packageController.updatePackageAvailability
);

router.patch(
  "/:id",
  upload.single("image"),
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
