import { body, param } from "express-validator";

export const validateCreateTour = [
  body("name")
    .trim()
    .isString()
    .withMessage("Name must be a string")
    .isLength({ min: 3, max: 100 })
    .withMessage("Name must be between 3 and 100 characters"),

  body("slug").trim().isString().withMessage("Slug must be a string"),

  body("description")
    .isString()
    .withMessage("Description must be a string")
    .isLength({ min: 10 })
    .withMessage("Description must be at least 10 characters"),

  body("tourAvailability")
    .isIn(["Available", "SoldOut", "ComingSoon"])
    .withMessage("Availability must be one of: Available, SoldOut, ComingSoon"),

  body("price").isNumeric().withMessage("Price must be a valid number"),

  body("tag")
    .isIn(["Regular", "Popular", "Top"])
    .withMessage("Tag must be one of: Regular, Popular, Top"),

  body("categoryID").isUUID().withMessage("Invalid category UUID"),
  body("locationId").isUUID().withMessage("Invalid Location UUID"),

  body("imageUrl")
    .optional({ nullable: true })
    .isString()
    .withMessage("Image URL must be a string"),
];

export const validateUpdateTour = [
  param("id").isUUID().withMessage("Invalid tour ID"),

  body("name")
    .optional()
    .isString()
    .isLength({ min: 3, max: 100 })
    .withMessage("Name must be between 3 and 100 characters"),

  body("slug").trim().isString().withMessage("Slug must be a string"),

  body("tourAvailability")
    .optional()
    .isIn(["Available", "SoldOut", "ComingSoon"])
    .withMessage("Availability must be one of: Available, SoldOut, ComingSoon"),

  body("description")
    .optional()
    .isString()
    .isLength({ min: 10 })
    .withMessage("Description must be at least 10 characters"),

  body("price")
    .optional()
    .isNumeric()
    .withMessage("Price must be a valid number"),

  body("tag")
    .optional()
    .isIn(["Regular", "Popular", "Top"])
    .withMessage("Tag must be one of: Regular, Popular, Top"),
  body("categoryID").optional().isUUID().withMessage("Invalid category UUID"),
  body("locationId").optional().isUUID().withMessage("Invalid Location UUID"),
];

export const validateUpdateAvailibility = [
  param("id").isUUID().withMessage("Invalid tour ID"),
  body("availability")
    .isIn(["Available", "SoldOut", "ComingSoon"])
    .withMessage("Availability must be one of: Available, SoldOut, ComingSoon"),
];

export const validateTourIDParam = [
  param("id").isUUID().withMessage("Invalid tour ID"),
];
