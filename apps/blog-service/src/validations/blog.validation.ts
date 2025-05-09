import { body, param } from "express-validator";

export const validateCreateBlog = [
  body("title")
    .isString()
    .isLength({ min: 5, max: 150 })
    .withMessage("Title must be between 5 and 150 characters"),

  body("slug").isString().withMessage("Slug must be a string"),

  body("authorID").isUUID().withMessage("Author ID must be a string"),

  body("categoryID").isUUID().withMessage("Invalid category UUID"),

  body("content")
    .isString()
    .isLength({ min: 50 })
    .withMessage("Content must be at least 50 characters"),

  body("excerpt").optional().isString().withMessage("Excerpt must be a string"),

  body("metaTitle")
    .optional()
    .isString()
    .isLength({ max: 150 })
    .withMessage("Meta title must not exceed 150 characters"),

  body("metaDescription")
    .optional()
    .isString()
    .isLength({ max: 300 })
    .withMessage("Meta description must not exceed 300 characters"),

  body("thumbnail")
    .optional()
    .isString()
    .withMessage("Thumbnail must be a string"),

  // body("tags")
  //   .optional()
  //   .isArray()
  //   .withMessage("Tags must be an array of strings"),

  body("status")
    .isIn(["draft", "published", "archived"])
    .withMessage("Status must be one of: draft, published, archived"),

  body("publishedAt")
    .optional()
    .isISO8601()
    .withMessage("PublishedAt must be a valid ISO8601 date"),

  body("scheduledAt")
    .optional()
    .isISO8601()
    .withMessage("ScheduledAt must be a valid ISO8601 date"),
];

export const validateUpdateBlog = [
  param("id").isUUID().withMessage("Invalid blog ID"),

  body("title")
    .optional()
    .isString()
    .isLength({ min: 5, max: 150 })
    .withMessage("Title must be between 5 and 150 characters"),

  body("slug").optional().isString().withMessage("Slug must be a string"),

  body("author").optional().isString().withMessage("Author must be a string"),

  body("categoryID").optional().isUUID().withMessage("Invalid category UUID"),

  body("content")
    .optional()
    .isString()
    .isLength({ min: 50 })
    .withMessage("Content must be at least 50 characters"),

  body("excerpt").optional().isString().withMessage("Excerpt must be a string"),

  body("metaTitle")
    .optional()
    .isString()
    .isLength({ max: 150 })
    .withMessage("Meta title must not exceed 150 characters"),

  body("metaDescription")
    .optional()
    .isString()
    .isLength({ max: 300 })
    .withMessage("Meta description must not exceed 300 characters"),

  body("thumbnail")
    .optional()
    .isString()
    .withMessage("Thumbnail must be a string"),

  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array of strings"),

  body("status")
    .optional()
    .isIn(["draft", "published", "archived"])
    .withMessage("Status must be one of: draft, published, archived"),

  body("publishedAt")
    .optional()
    .isISO8601()
    .withMessage("PublishedAt must be a valid ISO8601 date"),

  body("scheduledAt")
    .optional()
    .isISO8601()
    .withMessage("ScheduledAt must be a valid ISO8601 date"),
];

export const validateUpdateStatus = [
  param("id").isUUID().withMessage("Invalid blog ID"),

  body("status")
    .isIn(["draft", "published", "archived"])
    .withMessage("Status must be one of: draft, published, archived"),
];

export const validateIDParam = [
  param("id").isUUID().withMessage("Invalid blog ID"),
];

export const validateCategoryIDParam = [
  param("categoryID").isUUID().withMessage("Invalid category ID"),
];
