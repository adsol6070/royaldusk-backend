import { body, param } from "express-validator";

export const validateCreatePackagePolicy = [
  body("bookingPolicy")
    .isString()
    .withMessage("Booking policy must be a string"),

  body("cancellationPolicy")
    .isString()
    .withMessage("Cancellation policy must be a string"),

  body("paymentTerms")
    .isString()
    .withMessage("Payment terms must be a string"),

  body("visaDetail")
    .isString()
    .withMessage("Visa details must be a string"),
];

export const validateUpdatePackagePolicy = [
  param("id").isUUID().withMessage("Invalid Policy ID"),

  body("bookingPolicy")
    .optional()
    .isString()
    .withMessage("Booking policy must be a string"),

  body("cancellationPolicy")
    .optional()
    .isString()
    .withMessage("Cancellation policy must be a string"),

  body("paymentTerms")
    .optional()
    .isString()
    .withMessage("Payment terms must be a string"),

  body("visaDetail")
    .optional()
    .isString()
    .withMessage("Visa details must be a string"),
];

export const validatePolicyIDParam = [
  param("id").isUUID().withMessage("Invalid Policy ID"),
];
