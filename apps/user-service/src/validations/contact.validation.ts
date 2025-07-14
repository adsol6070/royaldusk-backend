// validations/contact.validation.ts
import { body } from "express-validator";

export const validateContactMessage = [
  body("fullName").notEmpty().withMessage("Full name is required"),
  body("email").isEmail().withMessage("Please provide a valid email address"),
  body("phone")
    .notEmpty()
    .withMessage("Phone number is required")
    .isMobilePhone("any")
    .withMessage("Invalid phone number"),
  body("subject").notEmpty().withMessage("Subject is required"),
  body("message").notEmpty().withMessage("Message is required"),
];