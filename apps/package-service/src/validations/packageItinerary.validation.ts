import { body, param } from "express-validator";

export const validateCreatePackageItinerary = [
  body("title").isString().withMessage("Itinerary title must be a string"),

  body("description")
    .isString()
    .isLength({ min: 20 })
    .withMessage("Description must be at least 20 characters"),
];

export const validateUpdatePackageItinerary = [
  param("id").isUUID().withMessage("Invalid Itinerary ID"),

  body("title")
    .optional()
    .isString()
    .withMessage("Itinerary title must be a string"),

  body("description")
    .optional()
    .isString()
    .isLength({ min: 20 })
    .withMessage("Description must be at least 20 characters"),
];

export const validateItineraryIDParam = [
  param("id").isUUID().withMessage("Invalid Itinerary ID"),
];
