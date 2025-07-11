import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from "@repo/utils/ApiError";

// Validation result handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg).join(', ');
        return next(new ApiError(400, errorMessages));
    }
    next();
};

// Add to wishlist validation
export const validateAddToWishlist = [
    body('itemType')
        .isIn(['Package', 'Tour'])
        .withMessage('Item type must be either Package or Tour'),

    body('packageId')
        .if(body('itemType').equals('Package'))
        .notEmpty()
        .withMessage('Package ID is required when item type is Package')
        .isUUID()
        .withMessage('Package ID must be a valid UUID'),

    body('tourId')
        .if(body('itemType').equals('Tour'))
        .notEmpty()
        .withMessage('Tour ID is required when item type is Tour')
        .isUUID()
        .withMessage('Tour ID must be a valid UUID'),

    body('packageId')
        .if(body('itemType').equals('Tour'))
        .isEmpty()
        .withMessage('Package ID should not be provided when item type is Tour'),

    body('tourId')
        .if(body('itemType').equals('Package'))
        .isEmpty()
        .withMessage('Tour ID should not be provided when item type is Package'),

    body('priority')
        .optional()
        .isIn(['Low', 'Medium', 'High'])
        .withMessage('Priority must be Low, Medium, or High'),

    body('notes')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Notes cannot exceed 1000 characters')
        .trim(),

    handleValidationErrors
];

// Get wishlist query validation
export const validateGetWishlist = [
    query('itemType')
        .optional()
        .isIn(['Package', 'Tour'])
        .withMessage('Item type must be either Package or Tour'),

    query('priority')
        .optional()
        .isIn(['Low', 'Medium', 'High'])
        .withMessage('Priority must be Low, Medium, or High'),

    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer')
        .toInt(),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt(),

    query('sortBy')
        .optional()
        .isIn(['createdAt', 'priority', 'updatedAt'])
        .withMessage('Sort by must be createdAt, priority, or updatedAt'),

    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc'),

    query('userId')
        .optional()
        .isUUID()
        .withMessage('User ID must be a valid UUID'),

    handleValidationErrors
];

// Priority parameter validation
export const validatePriorityParam = [
    param('priority')
        .isIn(['Low', 'Medium', 'High'])
        .withMessage('Priority must be Low, Medium, or High'),

    handleValidationErrors
];

// Item ID parameter validation
export const validateItemIdParam = [
    param('itemId')
        .notEmpty()
        .withMessage('Item ID is required')
        .isUUID()
        .withMessage('Item ID must be a valid UUID'),

    handleValidationErrors
];

// Update wishlist item validation
export const validateUpdateWishlistItem = [
    param('itemId')
        .notEmpty()
        .withMessage('Item ID is required')
        .isUUID()
        .withMessage('Item ID must be a valid UUID'),

    body('priority')
        .optional()
        .isIn(['Low', 'Medium', 'High'])
        .withMessage('Priority must be Low, Medium, or High'),

    body('notes')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Notes cannot exceed 1000 characters')
        .trim(),

    body('isNotified')
        .optional()
        .isBoolean()
        .withMessage('isNotified must be a boolean value'),

    // Ensure at least one field is provided
    body()
        .custom((value, { req }) => {
            const { priority, notes, isNotified } = req.body;
            if (!priority && notes === undefined && isNotified === undefined) {
                throw new Error('At least one field (priority, notes, or isNotified) must be provided');
            }
            return true;
        }),

    handleValidationErrors
];

// Check item in wishlist validation
export const validateCheckItemInWishlist = [
    param('itemType')
        .isIn(['Package', 'Tour'])
        .withMessage('Item type must be either Package or Tour'),

    param('itemId')
        .notEmpty()
        .withMessage('Item ID is required')
        .isUUID()
        .withMessage('Item ID must be a valid UUID'),

    handleValidationErrors
];

// Bulk remove items validation
export const validateBulkRemoveItems = [
    body('itemIds')
        .isArray({ min: 1, max: 50 })
        .withMessage('Item IDs must be an array with 1 to 50 items'),

    body('itemIds.*')
        .isUUID()
        .withMessage('Each item ID must be a valid UUID'),

    handleValidationErrors
];

// Bulk update priority validation
export const validateBulkUpdatePriority = [
    body('itemIds')
        .isArray({ min: 1, max: 50 })
        .withMessage('Item IDs must be an array with 1 to 50 items'),

    body('itemIds.*')
        .isUUID()
        .withMessage('Each item ID must be a valid UUID'),

    body('priority')
        .isIn(['Low', 'Medium', 'High'])
        .withMessage('Priority must be Low, Medium, or High'),

    handleValidationErrors
];

// Mark notification sent validation
export const validateMarkNotificationSent = [
    body('itemIds')
        .isArray({ min: 1, max: 100 })
        .withMessage('Item IDs must be an array with 1 to 100 items'),

    body('itemIds.*')
        .isUUID()
        .withMessage('Each item ID must be a valid UUID'),

    handleValidationErrors
];

// Update last viewed validation
export const validateUpdateLastViewed = [
    body('itemIds')
        .isArray({ min: 1, max: 50 })
        .withMessage('Item IDs must be an array with 1 to 50 items'),

    body('itemIds.*')
        .isUUID()
        .withMessage('Each item ID must be a valid UUID'),

    handleValidationErrors
];

// Analytics query validation
export const validateAnalyticsQuery = [
    query('userId')
        .optional()
        .isUUID()
        .withMessage('User ID must be a valid UUID'),

    handleValidationErrors
];

// General UUID parameter validation (reusable)
export const validateUUIDParam = (paramName: string) => [
    param(paramName)
        .notEmpty()
        .withMessage(`${paramName} is required`)
        .isUUID()
        .withMessage(`${paramName} must be a valid UUID`),

    handleValidationErrors
];

// Custom validation for conditional fields
export const validateConditionalFields = [
    body()
        .custom((value, { req }) => {
            const { itemType, packageId, tourId } = req.body;

            if (itemType === 'Package') {
                if (!packageId) {
                    throw new Error('Package ID is required when item type is Package');
                }
                if (tourId) {
                    throw new Error('Tour ID should not be provided when item type is Package');
                }
            }

            if (itemType === 'Tour') {
                if (!tourId) {
                    throw new Error('Tour ID is required when item type is Tour');
                }
                if (packageId) {
                    throw new Error('Package ID should not be provided when item type is Tour');
                }
            }

            return true;
        }),

    handleValidationErrors
];

// Sanitization middleware
export const sanitizeInput = [
    body('notes').optional().trim().escape(),
    body('priority').optional().trim(),
    body('itemType').optional().trim(),
];

// Rate limiting validation (optional - can be combined with express-rate-limit)
export const validateRateLimit = [
    body()
        .custom((value, { req }) => {
            // Add custom rate limiting logic if needed
            // This is just an example structure
            return true;
        }),
];

// Comprehensive validation chains for different scenarios
export const validateWishlistInput = [
    ...sanitizeInput,
    ...validateAddToWishlist,
];

export const validateWishlistQuery = [
    ...validateGetWishlist,
];

export const validateWishlistUpdate = [
    ...sanitizeInput,
    ...validateUpdateWishlistItem,
];

export const validateWishlistBulkOps = [
    ...validateBulkRemoveItems,
];

export const validateWishlistBulkPriority = [
    ...validateBulkUpdatePriority,
];