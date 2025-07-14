import rateLimit from "express-rate-limit";

export const otpRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // Limit each IP to 3 OTP requests per minute
  message: {
    success: false,
    message: "Too many OTP requests. Please try again later.",
    errorCode: "RATE_LIMITED"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const verificationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 verification attempts per 15 minutes
  message: {
    success: false,
    message: "Too many verification attempts. Please try again later.",
    errorCode: "RATE_LIMITED"
  },
  standardHeaders: true,
  legacyHeaders: false,
});