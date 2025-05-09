import { body } from "express-validator";

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
