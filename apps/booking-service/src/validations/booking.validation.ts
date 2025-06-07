import { body, param } from "express-validator";

export const validateCreateBooking = [
  body("userId")
    .optional({ nullable: true })
    .isUUID()
    .withMessage("User ID must be a valid UUID"),

  body("guestName")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 255 })
    .withMessage("Guest name must be a string with a max of 255 characters"),

  body("guestEmail")
    .optional({ nullable: true })
    .isEmail()
    .withMessage("Guest email must be a valid email address"),

  body("guestMobile")
    .optional({ nullable: true })
    .isString()
    .isLength({ min: 5, max: 20 })
    .withMessage("Guest mobile must be a valid string between 5 and 20 characters"),

  body("guestNationality")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 100 })
    .withMessage("Nationality must be a string with max 100 characters"),

  body("remarks")
    .optional({ nullable: true })
    .isString()
    .isLength({ max: 500 })
    .withMessage("Remarks must be a string with max 500 characters"),

  body("paymentMethod")
    .optional({ nullable: true })
    .isString()
    .isIn(["Credit Card", "Cash", "Bank Transfer"])
    .withMessage("Payment method must be one of: Credit Card, Cash, Bank Transfer"),

  body("agreedToTerms")
    .isBoolean()
    .withMessage("You must agree to the terms and conditions"),

  body("items")
    .isArray({ min: 1 })
    .withMessage("Items must be a non-empty array"),

  body("items.*.packageId")
    .isUUID()
    .withMessage("Each item must have a valid packageId (UUID)"),

  body("items.*.travelers")
    .isInt({ min: 1 })
    .withMessage("Travelers must be an integer of at least 1"),

  body("items.*.startDate")
    .isISO8601()
    .withMessage("StartDate must be a valid ISO8601 date"),
];

export const validateUpdateBookingItem = [
  param("id").isUUID().withMessage("Invalid booking item ID"),

  body("travelers")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Travelers must be an integer of at least 1"),

  body("startDate")
    .optional()
    .isISO8601()
    .withMessage("StartDate must be a valid ISO8601 date"),
];

export const validateBookingIdParam = [
  param("bookingId").isUUID().withMessage("Invalid booking ID"),
];

export const validateUpdateBookingStatus = [
  param("bookingId").isUUID().withMessage("Invalid booking ID"),

  body("status")
    .isString()
    .isIn(["Pending", "Confirmed", "Cancelled"])
    .withMessage("Status must be one of: pending, confirmed, cancelled"),
];

export const validateEmailQuery = [
   body("email")
    .isEmail()
    .withMessage("Email must be a valid email address"),
];