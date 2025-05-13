import { Router } from "express";
import { packageEnquiryController } from "../controllers";
import { validateRequest } from "@repo/middlewares/validateRequest";
import {
  validateCreateEnquiry,
  validateUpdateEnquiry,
  validateEnquiryIDParam,
} from "../validations/packageEnquiry.validation";

const router = Router();

router.post(
  "/",
  validateCreateEnquiry,
  validateRequest,
  packageEnquiryController.createEnquiry
);

router.get(
  "/:id",
  validateEnquiryIDParam,
  validateRequest,
  packageEnquiryController.getEnquiryByID
);

router.get("/", packageEnquiryController.getAllEnquiry);

router.patch(
  "/:id",
  validateEnquiryIDParam,
  validateUpdateEnquiry,
  validateRequest,
  packageEnquiryController.updateEnquiry
);

router.delete(
  "/:id",
  validateEnquiryIDParam,
  validateRequest,
  packageEnquiryController.deleteEnquiry
);

export default router;
