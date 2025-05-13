import { Router } from "express";
import { PackageCategoryController, PackageFeatureController, PackageServiceController } from "../controllers/genericModal.controller"; 
import { validateRequest } from "@repo/middlewares/validateRequest";
import {
  validateName,
  validateUpdateName,
  validateIDParam,
} from "../validations/genericModal.validation";

const router = Router();

router.post(
  "/categories",
  validateName("Package Category"),
  validateRequest,
  PackageCategoryController.create
);

router.get(
  "/categories/:id",
  validateIDParam("Package Category"),
  validateRequest,
  PackageCategoryController.getById
);

router.get(
  "/categories",
  PackageCategoryController.getAll
);

router.patch(
  "/categories/:id",
  validateIDParam("Package Category"),
  validateUpdateName("Package Category"),
  validateRequest,
  PackageCategoryController.update
);

router.delete(
  "/categories/:id",
  validateIDParam("Package Category"),
  validateRequest,
  PackageCategoryController.delete
);

// --- Package Features Routes ---
router.post(
  "/features",
  validateName("Package Feature"),
  validateRequest,
  PackageFeatureController.create
);

router.get(
  "/features/:id",
  validateIDParam("Package Feature"),
  validateRequest,
  PackageFeatureController.getById
);

router.get(
  "/features",
  PackageFeatureController.getAll
);

router.patch(
  "/features/:id",
  validateIDParam("Package Feature"),
  validateUpdateName("Package Feature"),
  validateRequest,
  PackageFeatureController.update
);

router.delete(
  "/features/:id",
  validateIDParam("Package Feature"),
  validateRequest,
  PackageFeatureController.delete
);

// --- Package Services Routes ---
router.post(
  "/services",
  validateName("Package Services"),
  validateRequest,
  PackageServiceController.create
);

router.get(
  "/services/:id",
  validateIDParam("Package Services"),
  validateRequest,
  PackageServiceController.getById
);

router.get(
  "/services",
  PackageServiceController.getAll
);

router.patch(
  "/services/:id",
  validateIDParam("Package Services"),
  validateUpdateName("Package Services"),
  validateRequest,
  PackageServiceController.update
);

router.delete(
  "/services/:id",
  validateIDParam("Package Services"),
  validateRequest,
  PackageServiceController.delete
);

export default router;
