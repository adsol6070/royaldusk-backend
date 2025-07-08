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

  body("agreedToTerms")
    .isBoolean()
    .withMessage("You must agree to the terms and conditions"),

  body("serviceType")
    .isString()
    .isIn(["Package", "Tour", "Hotel", "Activity", "Transport"])
    .withMessage("Service type must be one of: Package, Tour, Hotel, Activity, Transport"),

  body("serviceId")
    .isUUID()
    .withMessage("Service ID must be a valid UUID"),

  body("serviceData")
    .isObject()
    .withMessage("Service data must be a valid JSON object"),
];

export const validateBookingIdParam = [
  param("bookingId").isUUID().withMessage("Invalid booking ID"),
];

export const validateUpdateBookingStatus = [
  param("bookingId").isUUID().withMessage("Invalid booking ID"),

  body("status")
    .isString()
    .isIn(["Pending", "Confirmed", "Cancelled"])
    .withMessage("Status must be one of: Pending, Confirmed, Cancelled"),
];

export const validateEmailQuery = [
  body("email")
    .isEmail()
    .withMessage("Email must be a valid email address"),
];
