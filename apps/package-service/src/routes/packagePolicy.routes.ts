import { Router } from "express";
import { packagePolicyController } from "../controllers";
import { validateRequest } from "@repo/middlewares/validateRequest";
import {
  validateCreatePackagePolicy,
  validateUpdatePackagePolicy,
  validatePolicyIDParam,
} from "../validations/packagePolicy.validation";

const router = Router();

router.post(
  "/",
  validateCreatePackagePolicy,
  validateRequest,
  packagePolicyController.createPolicy
);

router.get(
  "/:id",
  validatePolicyIDParam,
  validateRequest,
  packagePolicyController.getPolicyByID
);

router.get("/", packagePolicyController.getAllPolicy);

router.patch(
  "/:id",
  validatePolicyIDParam,
  validateUpdatePackagePolicy,
  validateRequest,
  packagePolicyController.updatePolicy
);

router.delete(
  "/:id",
  validatePolicyIDParam,
  validateRequest,
  packagePolicyController.deletePolicy
);

export default router;
