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

// ==================== ADMIN RATE LIMITING ====================

export const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes for admin operations
  message: {
    success: false,
    message: "Too many admin requests. Please try again later.",
    errorCode: "ADMIN_RATE_LIMITED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for successful requests to avoid blocking legitimate admin usage
  skipSuccessfulRequests: false,
  // Custom key generator to potentially include user ID for authenticated requests
  keyGenerator: (req) => {
    // If admin is authenticated, use their ID + IP for more granular control
    const adminId = req.user?.id;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return adminId ? `admin_${adminId}_${ip}` : `admin_ip_${ip}`;
  }
});

export const sensitiveActionRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Very strict limit for sensitive admin actions
  message: {
    success: false,
    message: "Too many sensitive admin actions. Please wait before trying again.",
    errorCode: "SENSITIVE_ACTION_RATE_LIMITED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Don't skip any requests for sensitive actions
  skipSuccessfulRequests: false,
  // More strict key generation for sensitive actions
  keyGenerator: (req) => {
    const adminId = req.user?.id;
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const action = req.route?.path || 'unknown';
    return adminId ? `sensitive_${adminId}_${ip}_${action}` : `sensitive_ip_${ip}_${action}`;
  }
});

// ==================== ADDITIONAL ADMIN-SPECIFIC RATE LIMITS ====================

export const adminLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit login attempts per IP
  message: {
    success: false,
    message: "Too many admin login attempts. Please try again later.",
    errorCode: "ADMIN_LOGIN_RATE_LIMITED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use email + IP for login attempts to prevent account lockout abuse
  keyGenerator: (req) => {
    const email = req.body?.email || 'unknown';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `admin_login_${email}_${ip}`;
  }
});

export const adminInvitationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit admin invitations per hour
  message: {
    success: false,
    message: "Too many admin invitations sent. Please wait before sending more.",
    errorCode: "ADMIN_INVITATION_RATE_LIMITED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const adminId = req.user?.id || 'unknown';
    return `admin_invitations_${adminId}`;
  }
});

export const adminPasswordChangeRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit password changes per hour
  message: {
    success: false,
    message: "Too many password change attempts. Please wait before trying again.",
    errorCode: "PASSWORD_CHANGE_RATE_LIMITED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const adminId = req.user?.id || 'unknown';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `password_change_${adminId}_${ip}`;
  }
});

export const adminTwoFactorRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit 2FA attempts
  message: {
    success: false,
    message: "Too many 2FA attempts. Please wait before trying again.",
    errorCode: "TWO_FACTOR_RATE_LIMITED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body?.email || req.user?.email || 'unknown';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `admin_2fa_${email}_${ip}`;
  }
});

export const adminBulkActionRateLimit = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 3, // Very limited bulk operations
  message: {
    success: false,
    message: "Too many bulk operations. Please wait before performing more bulk actions.",
    errorCode: "BULK_ACTION_RATE_LIMITED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const adminId = req.user?.id || 'unknown';
    return `bulk_actions_${adminId}`;
  }
});

// ==================== PROGRESSIVE RATE LIMITING ====================

export const createProgressiveRateLimit = (baseMax: number, windowMs: number = 15 * 60 * 1000) => {
  return rateLimit({
    windowMs,
    max: (req) => {
      // Increase limits for super admins, decrease for regular users
      const userRole = req.user?.role;
      if (userRole === 'SUPER_ADMIN') {
        return baseMax * 3;
      } else if (userRole === 'ADMIN') {
        return baseMax * 2;
      } else if (userRole === 'MODERATOR') {
        return baseMax;
      }
      return Math.floor(baseMax / 2); // Lower limit for non-admin users
    },
    message: {
      success: false,
      message: "Rate limit exceeded based on your access level.",
      errorCode: "PROGRESSIVE_RATE_LIMITED"
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const userId = req.user?.id || 'unknown';
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      return `progressive_${userId}_${ip}`;
    }
  });
};

// ==================== SECURITY-FOCUSED RATE LIMITS ====================

export const securityEventRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Allow reasonable access to security events
  message: {
    success: false,
    message: "Too many security event requests. Please wait.",
    errorCode: "SECURITY_EVENT_RATE_LIMITED"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const auditLogRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // Generous limit for audit log access
  message: {
    success: false,
    message: "Too many audit log requests. Please wait.",
    errorCode: "AUDIT_LOG_RATE_LIMITED"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==================== EXPORT RATE LIMITING ====================

export const exportDataRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limited exports per hour
  message: {
    success: false,
    message: "Too many data export requests. Please wait before requesting another export.",
    errorCode: "EXPORT_RATE_LIMITED"
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const adminId = req.user?.id || 'unknown';
    return `export_data_${adminId}`;
  }
});

export default {
  otpRateLimit,
  verificationRateLimit,
  adminRateLimit,
  sensitiveActionRateLimit,
  adminLoginRateLimit,
  adminInvitationRateLimit,
  adminPasswordChangeRateLimit,
  adminTwoFactorRateLimit,
  adminBulkActionRateLimit,
  createProgressiveRateLimit,
  securityEventRateLimit,
  auditLogRateLimit,
  exportDataRateLimit
};