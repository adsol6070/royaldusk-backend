import { Router } from "express";
import { packageItineraryController } from "../controllers";
import { validateRequest } from "@repo/middlewares/validateRequest";
import {
  validateCreatePackageItinerary,
  validateUpdatePackageItinerary,
  validateItineraryIDParam,
} from "../validations/packageItinerary.validation";

const router = Router();

router.post(
  "/",
  validateCreatePackageItinerary,
  validateRequest,
  packageItineraryController.createItinerary
);

router.get(
  "/:id",
  validateItineraryIDParam,
  validateRequest,
  packageItineraryController.getItineraryByID
);

router.get("/", packageItineraryController.getAllItinerary);

router.patch(
  "/:id",
  validateItineraryIDParam,
  validateUpdatePackageItinerary,
  validateRequest,
  packageItineraryController.updateItinerary
);

router.delete(
  "/:id",
  validateItineraryIDParam,
  validateRequest,
  packageItineraryController.deleteItinerary
);

export default router;
