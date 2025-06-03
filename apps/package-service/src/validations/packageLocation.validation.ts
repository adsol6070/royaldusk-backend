import { body, param } from "express-validator";

// Validation for creating a location
export const validateCreateLocation = [
  body("name")
    .isString()
    .withMessage("Location name must be a string")
    .notEmpty()
    .withMessage("Location name is required"),
];

// Validation for updating a location
export const validateUpdateLocation = [
  param("id").isUUID().withMessage("Invalid Location ID"),

  body("name")
    .optional()
    .isString()
    .withMessage("Location name must be a string"),
];

// Validation for Location ID param
export const validateLocationIDParam = [
  param("id").isUUID().withMessage("Invalid Location ID"),
];
