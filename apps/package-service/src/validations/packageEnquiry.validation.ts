import { body, param } from "express-validator";

export const validateCreateEnquiry = [
  body("name").isString().withMessage("Name must be a string"),

  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("isdCode").isString().withMessage("ISD Code must be a string"),

  body("mobile").isString().withMessage("Mobile number must be a string"),

  body("dob")
    .isISO8601()
    .withMessage("Date must be in ISO8601 format (YYYY-MM-DD)"),

  body("adults").isNumeric().withMessage("Number of adults must be numeric"),

  body("children")
    .isNumeric()
    .withMessage("Number of children must be numeric"),

  body("flightBooked")
    .isString()
    .withMessage("Flight booked status must be a string"),

  body("remarks").optional().isString().withMessage("Remarks must be a string"),
];

export const validateUpdateEnquiry = [
  param("id").isUUID().withMessage("Invalid Enquiry ID"),

  body("name").optional().isString().withMessage("Name must be a string"),

  body("email").optional().isEmail().withMessage("Invalid email format"),

  body("mobile")
    .optional()
    .isString()
    .withMessage("Mobile number must be a string"),

  body("isdCode")
    .optional()
    .isString()
    .withMessage("ISD Code must be a string"),

  body("dob")
    .optional()
    .isISO8601()
    .withMessage("Date must be in ISO8601 format (YYYY-MM-DD)"),

  body("adults")
    .optional()
    .isNumeric()
    .withMessage("Number of adults must be numeric"),

  body("children")
    .optional()
    .isNumeric()
    .withMessage("Number of children must be numeric"),

  body("flightBooked")
    .optional()
    .isString()
    .withMessage("Flight booked status must be a string"),

  body("remarks").optional().isString().withMessage("Remarks must be a string"),
];

export const validateEnquiryIDParam = [
  param("id").isUUID().withMessage("Invalid Enquiry ID"),
];
