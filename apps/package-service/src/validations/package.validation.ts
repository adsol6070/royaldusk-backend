import { body, param } from "express-validator";

export const validateCreatePackage = [
  body("name").isString().withMessage("Package name must be a string"),

  body("slug").isString().withMessage("Slug must be a string"),

  body("description")
    .isString()
    .isLength({ min: 20 })
    .withMessage("Description must be at least 20 characters"),

  body("importantInfo")
    .isString()
    .withMessage("Important Info must be a string"),

  body("location").isString().withMessage("Location must be a string"),

  body("price")
    .isFloat({ gt: 0 })
    .withMessage("Price must be a positive number"),

  body("duration").isString().withMessage("Duration must be a string"),

  body("availability")
    .isIn(["Available", "SoldOut", "ComingSoon"])
    .withMessage("Availability must be one of: Available, SoldOut, ComingSoon"),

  body("hotels").isString().withMessage("Hotels must be a boolean"),

  body("imageUrl").optional().isString().withMessage("Image must be a string"),

  body("categoryID").isUUID().withMessage("Invalid category UUID"),

  body("featureIDs")
    .isArray({ min: 1 })
    .withMessage("featureIDs must be an array of UUIDs"),

  body("featureIDs.*")
    .isUUID()
    .withMessage("Each feature ID must be a valid UUID"),

  body("itineraryIDs")
    .isArray({ min: 1 })
    .withMessage("itineraryIDs must be an array of UUIDs"),

  body("itineraryIDs.*")
    .isUUID()
    .withMessage("Each itinerary ID must be a valid UUID"),

  body("inclusionIDs")
    .isArray({ min: 1 })
    .withMessage("inclusionIDs must be an array of UUIDs"),

  body("inclusionIDs.*")
    .isUUID()
    .withMessage("Each inclusion ID must be a valid UUID"),
  
    body("exclusionIDs")
    .isArray({ min: 1 })
    .withMessage("exclusionIDs must be an array of UUIDs"),

  body("exclusionIDs.*")
    .isUUID()
    .withMessage("Each exclusion ID must be a valid UUID"),

  body("policyID").isUUID().withMessage("Invalid policy UUID"),
];

export const validateUpdatePackage = [
  param("id").isUUID().withMessage("Invalid package ID"),

  body("name").optional().isString().withMessage("Package name must be a string"),

  body("slug").optional().isString().withMessage("Slug must be a string"),

  body("description")
    .optional()
    .isString()
    .isLength({ min: 20 })
    .withMessage("Description must be at least 20 characters"),

  body("importantInfo")
    .optional()
    .isString()
    .withMessage("Important Info must be a string"),

  body("location").optional().isString().withMessage("Location must be a string"),

  body("price")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Price must be a positive number"),

  body("duration").optional().isString().withMessage("Duration must be a string"),

  body("availability")
    .optional()
    .isIn(["Available", "SoldOut", "ComingSoon"])
    .withMessage("Availability must be one of: Available, SoldOut, ComingSoon"),

  body("hotels").optional().isString().withMessage("Hotels must be a boolean"),

  body("imageUrl").optional().isString().withMessage("Image must be a string"),

  body("categoryID").optional().isUUID().withMessage("Invalid category UUID"),

  body("featureIDs").optional().isArray().withMessage("featureIDs must be an array"),

  body("featureIDs.*").optional().isUUID().withMessage("Each feature ID must be a valid UUID"),

  body("itineraryIDs").optional().isArray().withMessage("itineraryIDs must be an array"),

  body("itineraryIDs.*").optional().isUUID().withMessage("Each itinerary ID must be a valid UUID"),

  body("inclusionIDs").optional().isArray().withMessage("inclusionIDs must be an array"),

  body("inclusionIDs.*").optional().isUUID().withMessage("Each inclusion ID must be a valid UUID"),

  body("exclusionIDs").optional().isArray().withMessage("exclusionIDs must be an array"),

  body("exclusionIDs.*").optional().isUUID().withMessage("Each exclusion ID must be a valid UUID"),

  body("policyID").optional().isUUID().withMessage("Invalid policy UUID"),
];

export const validateIDParam = [
  param("id").isUUID().withMessage("Invalid package ID"),
];

export const validateCategoryIDParam = [
  param("categoryID").isUUID().withMessage("Invalid category ID"),
];
