import { body } from "express-validator";

// ==================== EMAIL OTP VALIDATIONS ====================

export const validateSendOTP = [
    body("email")
        .isEmail()
        .normalizeEmail()
        .withMessage("Please provide a valid email address"),
    body("type")
        .optional()
        .isIn(["email"])
        .withMessage("Type must be 'email'")
];

export const validateVerifyOTP = [
    body("email")
        .isEmail()
        .normalizeEmail()
        .withMessage("Please provide a valid email address"),
    body("otp")
        .isLength({ min: 6, max: 6 })
        .isNumeric()
        .withMessage("OTP must be a 6-digit number"),
    body("type")
        .optional()
        .isIn(["email"])
        .withMessage("Type must be 'email'")
];

export const validateCompleteProfile = [
    body("name")
        .isLength({ min: 2, max: 50 })
        .trim()
        .escape()
        .withMessage("Name must be between 2 and 50 characters"),
    body("phone")
        .isMobilePhone("any")
        .withMessage("Please provide a valid phone number")
];

// ==================== SOCIAL LOGIN VALIDATIONS ====================

export const validateGoogleLogin = [
    body("idToken")
        .notEmpty()
        .withMessage("Google ID token is required")
];

export const validateAppleLogin = [
    body("identityToken")
        .notEmpty()
        .withMessage("Apple identity token is required"),
    body("email")
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage("Please provide a valid email address"),
    body("name")
        .optional()
        .isLength({ min: 2, max: 50 })
        .trim()
        .escape()
        .withMessage("Name must be between 2 and 50 characters")
];

// ==================== TOKEN VALIDATIONS ====================

export const validateRefreshToken = [
    body("refreshToken")
        .notEmpty()
        .withMessage("Refresh token is required")
];
