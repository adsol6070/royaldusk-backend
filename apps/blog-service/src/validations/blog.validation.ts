import { body, param } from "express-validator";

export const validateCreateBlog = [
  body("title")
    .trim()
    .isString()
    .withMessage("Title must be a string")
    .isLength({ min: 5, max: 150 })
    .withMessage("Title must be between 5 and 150 characters"),

  body("slug").trim().isString().withMessage("Slug must be a string"),

  body("authorID").isUUID().withMessage("Author ID must be a valid UUID"),

  body("categoryID").isUUID().withMessage("Category ID must be a valid UUID"),

  body("content")
    .isString()
    .withMessage("Content must be a string")
    .isLength({ min: 50 })
    .withMessage("Content must be at least 50 characters"),

  body("excerpt")
    .optional({ nullable: true })
    .isString()
    .withMessage("Excerpt must be a string"),

  body("metaTitle")
    .optional({ nullable: true })
    .isString()
    .withMessage("Meta title must be a string")
    .isLength({ max: 150 })
    .withMessage("Meta title must not exceed 150 characters"),

  body("metaDescription")
    .optional({ nullable: true })
    .isString()
    .withMessage("Meta description must be a string")
    .isLength({ max: 300 })
    .withMessage("Meta description must not exceed 300 characters"),

  body("thumbnail")
    .optional({ nullable: true })
    .isString()
    .withMessage("Thumbnail must be a string"),

  body("tags")
    .optional()
    .customSanitizer((value) => {
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          return [value];
        }
      }
      return value;
    })
    .isArray()
    .withMessage("Tags must be an array")
    .custom((arr) => arr.every((tag: string) => typeof tag === "string"))
    .withMessage("Each tag must be a string"),

  body("status")
    .isIn(["draft", "published", "archived"])
    .withMessage("Status must be one of: draft, published, archived"),

  body("publishedAt")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("PublishedAt must be a valid ISO8601 date"),

  body("scheduledAt")
    .optional({ nullable: true })
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
    .customSanitizer((value) => {
      if (typeof value === "string") {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          return [value];
        }
      }
      return value;
    })
    .isArray()
    .withMessage("Tags must be an array")
    .custom((arr) => arr.every((tag: string) => typeof tag === "string"))
    .withMessage("Each tag must be a string"),

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
