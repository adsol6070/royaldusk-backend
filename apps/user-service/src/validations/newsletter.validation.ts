import { body, param } from "express-validator";

// Subscribe to newsletter
export const validateNewsletterSubscribe = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
];

// Update subscription (based on email)
export const validateUpdateSubscription = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("isActive")
    .isBoolean()
    .withMessage("isActive must be a boolean"),
];
