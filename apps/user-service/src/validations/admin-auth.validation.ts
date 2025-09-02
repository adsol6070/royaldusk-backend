import { body, param, query } from "express-validator";

// ==================== ADMIN REGISTRATION VALIDATION ====================

export const validateAdminRegistrationInit = [
    body("email")
        .isEmail()
        .normalizeEmail()
        .withMessage("Valid email is required"),

    body("role")
        .isIn(["ADMIN", "MODERATOR"])
        .withMessage("Role must be either ADMIN or MODERATOR"),
];

export const validateAdminRegistrationComplete = [
    body("registrationToken")
        .notEmpty()
        .withMessage("Registration token is required"),

    body("password")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters long")
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"),

    body("name")
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage("Name must be between 2 and 50 characters"),

    body("phone")
        .optional()
        .isMobilePhone("any")
        .withMessage("Valid phone number is required if provided"),
];

// ==================== ADMIN LOGIN VALIDATION ====================

export const validateAdminLogin = [
    body("email")
        .isEmail()
        .normalizeEmail()
        .withMessage("Valid email is required"),

    body("password")
        .notEmpty()
        .withMessage("Password is required"),
];

export const validateTwoFactorAuth = [
    body("twoFactorToken")
        .notEmpty()
        .withMessage("Two-factor token is required"),

    body("otp")
        .isLength({ min: 6, max: 6 })
        .isNumeric()
        .withMessage("OTP must be a 6-digit number"),
];

// ==================== ADMIN MANAGEMENT VALIDATION ====================

export const validateAdminRoleUpdate = [
    body("adminId")
        .isUUID()
        .withMessage("Valid admin ID is required"),

    body("newRole")
        .isIn(["ADMIN", "MODERATOR"])
        .withMessage("New role must be either ADMIN or MODERATOR"),
];

export const validateAdminProfileUpdate = [
    body("name")
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage("Name must be between 2 and 50 characters"),

    body("phone")
        .optional()
        .isMobilePhone("any")
        .withMessage("Valid phone number is required"),

    body("email")
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage("Valid email is required"),
];

// ==================== PASSWORD VALIDATION ====================

export const validatePasswordChange = [
    body("currentPassword")
        .notEmpty()
        .withMessage("Current password is required"),

    body("newPassword")
        .isLength({ min: 8 })
        .withMessage("New password must be at least 8 characters long")
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage("New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"),

    body("confirmPassword")
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error("Password confirmation does not match");
            }
            return true;
        }),
];

// ==================== TWO FACTOR AUTH VALIDATION ====================

export const validateEnableTwoFactor = [
    body("password")
        .notEmpty()
        .withMessage("Current password is required to enable 2FA"),
];

export const validateDisableTwoFactor = [
    body("otp")
        .isLength({ min: 6, max: 6 })
        .isNumeric()
        .withMessage("OTP must be a 6-digit number"),

    body("password")
        .notEmpty()
        .withMessage("Current password is required to disable 2FA"),
];

// ==================== ADMIN SPECIFIC VALIDATIONS ====================

export const validateAdminIdParam = [
    param("adminId")
        .isUUID()
        .withMessage("Valid admin ID is required"),
];

export const validateUserIdParam = [
    param("userId")
        .isUUID()
        .withMessage("Valid user ID is required"),
];

export const validateNotificationIdParam = [
    param("notificationId")
        .isUUID()
        .withMessage("Valid notification ID is required"),
];

export const validateEventIdParam = [
    param("eventId")
        .isUUID()
        .withMessage("Valid event ID is required"),
];

export const validateSessionIdParam = [
    param("sessionId")
        .isUUID()
        .withMessage("Valid session ID is required"),
];

export const validateInvitationIdParam = [
    param("invitationId")
        .isUUID()
        .withMessage("Valid invitation ID is required"),
];

// ==================== BULK OPERATIONS VALIDATION ====================

export const validateBulkAdminAction = [
    body("adminIds")
        .isArray({ min: 1 })
        .withMessage("At least one admin ID is required"),

    body("adminIds.*")
        .isUUID()
        .withMessage("All admin IDs must be valid UUIDs"),

    body("action")
        .isIn(["activate", "deactivate", "delete"])
        .withMessage("Action must be activate, deactivate, or delete"),
];

// ==================== SEARCH AND FILTER VALIDATION ====================

export const validateAdminSearch = [
    query("query")
        .optional()
        .trim()
        .isLength({ min: 2 })
        .withMessage("Search query must be at least 2 characters"),

    query("role")
        .optional()
        .isIn(["SUPER_ADMIN", "ADMIN", "MODERATOR"])
        .withMessage("Role filter must be SUPER_ADMIN, ADMIN, or MODERATOR"),

    query("status")
        .optional()
        .isIn(["active", "inactive", "pending"])
        .withMessage("Status filter must be active, inactive, or pending"),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),

    query("offset")
        .optional()
        .isInt({ min: 0 })
        .withMessage("Offset must be 0 or greater"),
];

// ==================== ADMIN SETTINGS VALIDATION ====================

export const validateAdminSettings = [
    body("sessionTimeout")
        .optional()
        .isInt({ min: 15, max: 480 })
        .withMessage("Session timeout must be between 15 and 480 minutes"),

    body("maxLoginAttempts")
        .optional()
        .isInt({ min: 3, max: 10 })
        .withMessage("Max login attempts must be between 3 and 10"),

    body("passwordExpiryDays")
        .optional()
        .isInt({ min: 30, max: 365 })
        .withMessage("Password expiry must be between 30 and 365 days"),

    body("requireTwoFactor")
        .optional()
        .isBoolean()
        .withMessage("Require two factor must be a boolean"),
];

export const validateSettingKey = [
    param("key")
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage("Setting key must contain only alphanumeric characters and underscores"),
];

export const validateSettingValue = [
    body("value")
        .notEmpty()
        .withMessage("Setting value is required"),
];

// ==================== AUDIT LOG VALIDATION ====================

export const validateAuditLogQuery = [
    query("startDate")
        .optional()
        .isISO8601()
        .withMessage("Start date must be a valid ISO 8601 date"),

    query("endDate")
        .optional()
        .isISO8601()
        .withMessage("End date must be a valid ISO 8601 date"),

    query("adminId")
        .optional()
        .isUUID()
        .withMessage("Admin ID must be a valid UUID"),

    query("action")
        .optional()
        .trim()
        .isLength({ min: 1 })
        .withMessage("Action filter cannot be empty"),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage("Limit must be between 1 and 1000"),
];

// ==================== REFRESH TOKEN VALIDATION ====================

export const validateRefreshToken = [
    body("refreshToken")
        .notEmpty()
        .withMessage("Refresh token is required"),
];

// ==================== NOTIFICATION VALIDATION ====================

export const validateCreateNotification = [
    body("adminId")
        .isUUID()
        .withMessage("Valid admin ID is required"),

    body("type")
        .isIn(["SECURITY_ALERT", "SYSTEM_UPDATE", "USER_ACTIVITY", "BOOKING_ALERT", "PAYMENT_ISSUE", "GENERAL"])
        .withMessage("Invalid notification type"),

    body("title")
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage("Title must be between 1 and 255 characters"),

    body("message")
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage("Message must be between 1 and 1000 characters"),

    body("priority")
        .optional()
        .isIn(["LOW", "MEDIUM", "HIGH", "URGENT"])
        .withMessage("Priority must be LOW, MEDIUM, HIGH, or URGENT"),

    body("expiresAt")
        .optional()
        .isISO8601()
        .withMessage("Expires at must be a valid ISO 8601 date"),
];

// ==================== SECURITY EVENT VALIDATION ====================

export const validateSecurityEventQuery = [
    query("severity")
        .optional()
        .isIn(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
        .withMessage("Severity must be LOW, MEDIUM, HIGH, or CRITICAL"),

    query("eventType")
        .optional()
        .isIn([
            "SUSPICIOUS_LOGIN",
            "MULTIPLE_FAILED_LOGINS",
            "ADMIN_PRIVILEGE_ESCALATION",
            "UNAUTHORIZED_ACCESS_ATTEMPT",
            "DATA_BREACH_ATTEMPT",
            "UNUSUAL_ACTIVITY",
            "ACCOUNT_COMPROMISE"
        ])
        .withMessage("Invalid event type"),

    query("resolved")
        .optional()
        .isBoolean()
        .withMessage("Resolved must be a boolean"),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 500 })
        .withMessage("Limit must be between 1 and 500"),
];

// ==================== SYSTEM HEALTH VALIDATION ====================

export const validateSystemHealthQuery = [
    query("component")
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage("Component name must be between 1 and 100 characters"),

    query("status")
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage("Status must be between 1 and 50 characters"),

    query("hours")
        .optional()
        .isInt({ min: 1, max: 168 }) // Max 1 week
        .withMessage("Hours must be between 1 and 168 (1 week)"),
];

// ==================== INVITATION VALIDATION ====================

export const validateRevokeInvitation = [
    body("reason")
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Reason must not exceed 500 characters"),
];

// ==================== CUSTOM VALIDATION HELPERS ====================

export const validateStrongPassword = (password: string): boolean => {
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
};

// export const validateEmailDomain = (email: string, allowedDomains: string[]): boolean => {
//   const domain = email.split('@')[1];
//   return allowedDomains.includes(domain);
// };

export const validateIPWhitelist = (ip: string, whitelist: string[]): boolean => {
    return whitelist.includes(ip) || whitelist.includes('*');
};

// ==================== DATETIME VALIDATION HELPERS ====================

export const validateDateRange = [
    body("startDate")
        .optional()
        .isISO8601()
        .custom((value, { req }) => {
            if (req.body.endDate && new Date(value) > new Date(req.body.endDate)) {
                throw new Error("Start date must be before end date");
            }
            return true;
        }),

    body("endDate")
        .optional()
        .isISO8601()
        .custom((value, { req }) => {
            if (req.body.startDate && new Date(value) < new Date(req.body.startDate)) {
                throw new Error("End date must be after start date");
            }
            return true;
        }),
];

// ==================== PAGINATION VALIDATION ====================

export const validatePagination = [
    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page must be a positive integer"),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit must be between 1 and 100"),

    query("sortBy")
        .optional()
        .isIn(["createdAt", "updatedAt", "name", "email", "role"])
        .withMessage("Sort by must be one of: createdAt, updatedAt, name, email, role"),

    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("Sort order must be 'asc' or 'desc'"),
];

// ==================== FILE UPLOAD VALIDATION ====================

export const validateFileUpload = [
    body("fileType")
        .optional()
        .isIn(["image", "document", "csv"])
        .withMessage("File type must be image, document, or csv"),

    body("maxSize")
        .optional()
        .isInt({ min: 1, max: 10485760 }) // Max 10MB
        .withMessage("Max size must be between 1 byte and 10MB"),
];

// ==================== EXPORT VALIDATION ====================

export const validateExportRequest = [
    body("format")
        .isIn(["csv", "json", "xlsx"])
        .withMessage("Export format must be csv, json, or xlsx"),

    body("fields")
        .optional()
        .isArray()
        .withMessage("Fields must be an array"),

    body("dateRange")
        .optional()
        .isObject()
        .withMessage("Date range must be an object"),
];

export default {
    validateAdminRegistrationInit,
    validateAdminRegistrationComplete,
    validateAdminLogin,
    validateTwoFactorAuth,
    validateAdminRoleUpdate,
    validateAdminProfileUpdate,
    validatePasswordChange,
    validateEnableTwoFactor,
    validateDisableTwoFactor,
    validateAdminIdParam,
    validateUserIdParam,
    validateNotificationIdParam,
    validateEventIdParam,
    validateSessionIdParam,
    validateInvitationIdParam,
    validateBulkAdminAction,
    validateAdminSearch,
    validateAdminSettings,
    validateSettingKey,
    validateSettingValue,
    validateAuditLogQuery,
    validateRefreshToken,
    validateCreateNotification,
    validateSecurityEventQuery,
    validateSystemHealthQuery,
    validateRevokeInvitation,
    validateStrongPassword,
    //   validateEmailDomain,
    validateIPWhitelist,
    validateDateRange,
    validatePagination,
    validateFileUpload,
    validateExportRequest
};