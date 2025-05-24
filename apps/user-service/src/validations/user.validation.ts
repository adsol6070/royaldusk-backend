import { body, param } from "express-validator";

export const validateRegistration = [
  body("name").notEmpty().withMessage("Name is required"),
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long"),
];

export const validateLogin = [
  body("email").isEmail().withMessage("Invalid email format."),
  body("password").notEmpty().withMessage("Password is required."),
];

export const validateVerifyEmail = [
  body("verificationCode")
    .isHexadecimal()
    .withMessage("Invalid verification code format")
    .isLength({ min: 64, max: 64 })
    .withMessage("Verification code must be 64 characters long"),
];
