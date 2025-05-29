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
    .customSanitizer((value) => {
      try {
        return typeof value === "string" ? JSON.parse(value) : value;
      } catch {
        return [];
      }
    })
    .isArray({ min: 1 })
    .withMessage("featureIDs must be a non-empty array of UUIDs"),

  body("featureIDs.*")
    .isUUID()
    .withMessage("Each feature ID must be a valid UUID"),

  body("timeline")
    .customSanitizer((value) => {
      try {
        return Array.isArray(value) ? value : JSON.parse(value);
      } catch (error) {
        return [];
      }
    })
    .custom((timeline) => {
      if (!Array.isArray(timeline) || timeline.length === 0) {
        throw new Error("Timeline must be a non-empty array");
      }

      for (const [i, item] of timeline.entries()) {
        if (!Number.isInteger(item.day) || item.day < 1) {
          throw new Error(
            `Timeline item #${i + 1} must have a valid 'day' number`
          );
        }

        if (!Array.isArray(item.entries) || item.entries.length === 0) {
          throw new Error(
            `Timeline item #${i + 1} must have a non-empty 'entries' array`
          );
        }

        for (const [j, entry] of item.entries.entries()) {
          if (
            typeof entry.itineraryId !== "string" ||
            !/^[0-9a-fA-F-]{36}$/.test(entry.itineraryId)
          ) {
            throw new Error(
              `Timeline item #${i + 1}, entry #${j + 1} must have a valid UUID 'itineraryId'`
            );
          }

          if (typeof entry.title !== "string" || !entry.title.trim()) {
            throw new Error(
              `Timeline item #${i + 1}, entry #${j + 1} must have a non-empty 'title' string`
            );
          }

          if (
            typeof entry.description !== "string" ||
            !entry.description.trim()
          ) {
            throw new Error(
              `Timeline item #${i + 1}, entry #${j + 1} must have a non-empty 'description' string`
            );
          }
        }
      }

      return true;
    }),

  body("inclusionIDs")
    .customSanitizer((value) => {
      try {
        return typeof value === "string" ? JSON.parse(value) : value;
      } catch {
        return [];
      }
    })
    .isArray({ min: 1 })
    .withMessage("inclusionIDs must be a non-empty array of UUIDs"),

  body("inclusionIDs.*")
    .isUUID()
    .withMessage("Each inclusion ID must be a valid UUID"),

  body("exclusionIDs")
    .customSanitizer((value) => {
      try {
        return typeof value === "string" ? JSON.parse(value) : value;
      } catch {
        return [];
      }
    })
    .isArray({ min: 1 })
    .withMessage("exclusionIDs must be a non-empty array of UUIDs"),

  body("exclusionIDs.*")
    .isUUID()
    .withMessage("Each exclusion ID must be a valid UUID"),

  body("policyID").isUUID().withMessage("Invalid policy UUID"),
];

export const validateUpdatePackage = [
  param("id").isUUID().withMessage("Invalid package ID"),

  body("name")
    .optional()
    .isString()
    .withMessage("Package name must be a string"),

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

  body("location")
    .optional()
    .isString()
    .withMessage("Location must be a string"),

  body("price")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Price must be a positive number"),

  body("duration")
    .optional()
    .isString()
    .withMessage("Duration must be a string"),

  body("availability")
    .optional()
    .isIn(["Available", "SoldOut", "ComingSoon"])
    .withMessage("Availability must be one of: Available, SoldOut, ComingSoon"),

  body("hotels").optional().isString().withMessage("Hotels must be a boolean"),

  body("imageUrl").optional().isString().withMessage("Image must be a string"),

  body("categoryID").optional().isUUID().withMessage("Invalid category UUID"),

  body("featureIDs")
    .optional()
    .customSanitizer((value) => (Array.isArray(value) ? value : [value]))
    .isArray()
    .withMessage("featureIDs must be an array"),

  body("featureIDs.*")
    .optional()
    .isUUID()
    .withMessage("Each feature ID must be a valid UUID"),

  // body("itineraryIDs")
  //   .optional()
  //   .customSanitizer((value) => (Array.isArray(value) ? value : [value]))
  //   .isArray()
  //   .withMessage("featureIDs must be an array"),

  // body("itineraryIDs.*")
  //   .optional()
  //   .isUUID()
  //   .withMessage("Each feature ID must be a valid UUID"),

  body("timeline")
    .optional()
    .isArray()
    .withMessage("Timeline must be an array"),

  body("timeline.*.day")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Each timeline entry must have a valid day number"),

  body("timeline.*.title")
    .optional()
    .isString()
    .withMessage("Each timeline entry must have a title string"),

  body("timeline.*.description")
    .optional()
    .isString()
    .withMessage("Each timeline entry must have a description string"),

  body("timeline.*.selectedOptions")
    .optional()
    .isArray()
    .withMessage("Each timeline entry must have selectedOptions array"),

  body("timeline.*.selectedOptions.*.value")
    .optional()
    .isUUID()
    .withMessage("Each selectedOption value must be a valid UUID"),

  body("timeline.*.selectedOptions.*.label")
    .optional()
    .isString()
    .withMessage("Each selectedOption label must be a string"),

  body("inclusionIDs")
    .optional()
    .customSanitizer((value) => (Array.isArray(value) ? value : [value]))
    .isArray()
    .withMessage("featureIDs must be an array"),

  body("inclusionIDs.*")
    .optional()
    .isUUID()
    .withMessage("Each feature ID must be a valid UUID"),

  body("exclusionIDs")
    .optional()
    .customSanitizer((value) => (Array.isArray(value) ? value : [value]))
    .isArray()
    .withMessage("featureIDs must be an array"),

  body("exclusionIDs.*")
    .optional()
    .isUUID()
    .withMessage("Each feature ID must be a valid UUID"),

  body("policyID").optional().isUUID().withMessage("Invalid policy UUID"),
];

export const validateUpdateAvailability = [
  param("id").isUUID().withMessage("Invalid package ID"),
  body("availability")
    .isIn(["Available", "SoldOut", "ComingSoon"])
    .withMessage("Availability must be one of: Available, SoldOut, ComingSoon"),
];

export const validateIDParam = [
  param("id").isUUID().withMessage("Invalid package ID"),
];

export const validateCategoryIDParam = [
  param("categoryID").isUUID().withMessage("Invalid category ID"),
];
