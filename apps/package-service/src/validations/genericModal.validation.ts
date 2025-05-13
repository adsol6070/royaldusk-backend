// validations/genericModal.validation.ts
import { body, param } from "express-validator";

export const validateName = (entityName: string) => [
  body("name")
    .notEmpty()
    .withMessage(`${entityName} name is required`)
    .isString()
    .withMessage(`${entityName} name must be a string`),
];

export const validateUpdateName = (entityName: string) => [
  body("name")
    .optional()
    .isString()
    .withMessage(`${entityName} name must be a string`),
];

export const validateIDParam = (entityName: string) => [
  param("id")
    .isUUID()
    .withMessage(`Invalid ${entityName} ID format`),
];
