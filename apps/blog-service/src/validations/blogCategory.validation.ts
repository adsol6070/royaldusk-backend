import { body, param } from "express-validator";

export const validateCreateCategory = [
  body("name").notEmpty().withMessage("Name is required"),
];

export const validateUpdateCategory = [
  body("name")
    .optional()
    .notEmpty()
    .withMessage("Name must not be empty if provided"),
];

export const validateIDParam = [
  param("id").isUUID().withMessage("Invalid ID format"),
];
