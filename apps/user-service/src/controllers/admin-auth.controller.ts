// ==================== ADMIN AUTH CONTROLLER ====================
import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/user.service";
import { rabbitMQ } from "../services/rabbitmq.service";
import { ApiError } from "@repo/utils/ApiError";
import bcrypt from "bcryptjs";
import { OtpType, RoleEnumType } from "@repo/database";

// Admin role enum
export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  MODERATOR = "MODERATOR",
  USER = "USER",
}

const adminAuthController = {
  // ==================== ADMIN REGISTRATION ====================

  /**
   * Step 1: Super Admin initiates admin registration
   * Only super admins can create new admin accounts
   */
  initiateAdminRegistration: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email, role = UserRole.ADMIN } = req.body;
      const initiatorId = req.admin?.id;

      if (!initiatorId) {
        throw new ApiError(401, "Admin authentication required");
      }

      // Verify initiator is super admin
      const initiator = await UserService.findUniqueUser(
        { id: initiatorId },
        { role: true }
      );

      if (!initiator || initiator.role !== UserRole.SUPER_ADMIN) {
        throw new ApiError(403, "Only super admins can create admin accounts");
      }

      // Validate role
      if (![UserRole.ADMIN, UserRole.MODERATOR].includes(role)) {
        throw new ApiError(400, "Invalid admin role");
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists
      const existingUser = await UserService.findUniqueUser(
        { email: normalizedEmail },
        { id: true, email: true }
      );

      if (existingUser) {
        throw new ApiError(409, "User with this email already exists");
      }

      // Generate secure registration token (24 hours validity)
      const registrationToken = await UserService.generateRegistrationToken({
        email: normalizedEmail,
        role,
        invitedBy: initiatorId,
      });

      // Send invitation email
      await rabbitMQ.publishToQueue("email.admin-invitation", {
        to: normalizedEmail,
        subject: "Admin Dashboard Invitation - Royal Dusk",
        templateName: "admin-invitation",
        templateData: {
          registrationToken,
          role,
          inviterName: req.admin?.name || "Admin",
          expiresIn: 24, // hours
        },
      });

      res.status(200).json({
        success: true,
        message: "Admin invitation sent successfully",
        data: {
          email: normalizedEmail,
          role,
          expiresIn: 24 * 60 * 60, // 24 hours in seconds
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Step 2: Admin completes registration using invitation token
   */
  completeAdminRegistration: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { registrationToken, password, name, phone } = req.body;

      if (!registrationToken || !password || !name) {
        throw new ApiError(
          400,
          "Registration token, password, and name are required"
        );
      }

      // Verify registration token
      const tokenData =
        await UserService.verifyRegistrationToken(registrationToken);

      if (!tokenData) {
        throw new ApiError(401, "Invalid or expired registration token");
      }

      // Validate password strength
      if (password.length < 8) {
        throw new ApiError(400, "Password must be at least 8 characters long");
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create admin user
      const newAdmin = await UserService.createUser({
        email: tokenData.email,
        name: name.trim(),
        phone: phone?.trim(),
        password: hashedPassword,
        role: tokenData.role as RoleEnumType,
        verified: true,
        profile_completed: true,
      });

      // Invalidate registration token
      await UserService.invalidateRegistrationToken(registrationToken);

      // Generate access tokens
      const { access_token, refresh_token } =
        await UserService.signTokens(newAdmin);

      // Log admin creation
      console.log(
        `New admin created: ${newAdmin.email} with role ${newAdmin.role}`
      );

      res.status(201).json({
        success: true,
        message: "Admin registration completed successfully",
        data: {
          token: access_token,
          refreshToken: refresh_token,
          user: {
            id: newAdmin.id,
            email: newAdmin.email,
            name: newAdmin.name,
            role: newAdmin.role,
            verified: true,
            joinedDate: newAdmin.createdAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // ==================== ADMIN LOGIN ====================

  /**
   * Step 1: Admin email/password login
   */
  adminLogin: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Find admin user
      const user = await UserService.findUniqueUser(
        { email: normalizedEmail },
        {
          id: true,
          email: true,
          name: true,
          password: true,
          role: true,
          verified: true,
          profile_completed: true,
          createdAt: true,
          two_factor_enabled: true,
        }
      );

      if (!user) {
        throw new ApiError(401, "Invalid email or password");
      }

      // Check if user is admin
      if (
        ![UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR].includes(
          user.role as UserRole
        )
      ) {
        throw new ApiError(403, "Access denied. Admin privileges required.");
      }

      // Verify password
      if (!user.password) {
        throw new ApiError(401, "Invalid email or password");
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new ApiError(401, "Invalid email or password");
      }

      // Check if 2FA is enabled
      if (user.two_factor_enabled) {
        // Generate and send 2FA code
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        await UserService.storeOTP({
          email: normalizedEmail,
          otp,
          type: OtpType.TWO_FACTOR,
          expiresAt,
        });

        // Send 2FA code
        await rabbitMQ.publishToQueue("email.two-factor", {
          to: normalizedEmail,
          subject: "Two-Factor Authentication Code - Royal Dusk Admin",
          templateName: "two-factor-code",
          templateData: {
            otp,
            name: user.name,
            expiresIn: 10,
          },
        });

        // Generate temporary 2FA token
        const twoFactorToken = await UserService.generateTwoFactorToken(
          user.id
        );

        res.status(200).json({
          success: true,
          message: "2FA code sent to your email",
          data: {
            requires2FA: true,
            twoFactorToken,
            email: normalizedEmail,
          },
        });
        return;
      }

      // Generate tokens for direct login (no 2FA)
      const { access_token, refresh_token } =
        await UserService.signTokens(user);

      res.status(200).json({
        success: true,
        message: "Admin login successful",
        data: {
          requires2FA: false,
          token: access_token,
          refreshToken: refresh_token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            verified: true,
            joinedDate: user.createdAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Step 2: Verify 2FA code (if enabled)
   */
  verify2FA: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { twoFactorToken, otp } = req.body;

      if (!twoFactorToken || !otp) {
        throw new ApiError(400, "2FA token and OTP are required");
      }

      // Verify 2FA token and get user ID
      const userId = await UserService.verifyTwoFactorToken(twoFactorToken);

      if (!userId) {
        throw new ApiError(401, "Invalid or expired 2FA token");
      }

      // Get user details
      const user = await UserService.findUniqueUser(
        { id: userId },
        {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        }
      );

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      // Verify OTP
      const isValidOTP = await UserService.verifyOTP(
        user.email,
        otp,
        OtpType.TWO_FACTOR
      );

      if (!isValidOTP) {
        throw new ApiError(400, "Invalid or expired OTP");
      }

      // Generate final tokens
      const { access_token, refresh_token } =
        await UserService.signTokens(user);

      res.status(200).json({
        success: true,
        message: "2FA verification successful",
        data: {
          token: access_token,
          refreshToken: refresh_token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            verified: true,
            joinedDate: user.createdAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // ==================== ADMIN MANAGEMENT ====================

  /**
   * Get all admin users (Super Admin only)
   */
  getAllAdmins: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const requesterId = req.admin?.id;

      // Verify requester is super admin
      const requester = await UserService.findUniqueUser(
        { id: requesterId },
        { role: true }
      );

      if (!requester || requester.role !== UserRole.SUPER_ADMIN) {
        throw new ApiError(403, "Only super admins can view all admin users");
      }

      const admins = await UserService.findManyUsers(
        {
          role: {
            in: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR],
          },
        },
        {
          id: true,
          email: true,
          name: true,
          role: true,
          verified: true,
          createdAt: true,
          two_factor_enabled: true,
        }
      );

      res.status(200).json({
        success: true,
        data: {
          admins: admins.map((admin) => ({
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            verified: admin.verified,
            twoFactorEnabled: admin.two_factor_enabled,
            joinedDate: admin.createdAt,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update admin role (Super Admin only)
   */
  updateAdminRole: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { adminId, newRole } = req.body;
      const requesterId = req.user?.id;

      // Verify requester is super admin
      const requester = await UserService.findUniqueUser(
        { id: requesterId },
        { role: true }
      );

      if (!requester || requester.role !== UserRole.SUPER_ADMIN) {
        throw new ApiError(403, "Only super admins can update admin roles");
      }

      // Validate new role
      if (![UserRole.ADMIN, UserRole.MODERATOR].includes(newRole)) {
        throw new ApiError(
          400,
          "Invalid role. Only ADMIN and MODERATOR roles can be assigned"
        );
      }

      // Prevent self-role change
      if (adminId === requesterId) {
        throw new ApiError(400, "Cannot change your own role");
      }

      // Update admin role
      const updatedAdmin = await UserService.updateUser(
        { id: adminId },
        { role: newRole },
        {
          id: true,
          email: true,
          name: true,
          role: true,
        }
      );

      res.status(200).json({
        success: true,
        message: "Admin role updated successfully",
        data: {
          admin: {
            id: updatedAdmin.id,
            email: updatedAdmin.email,
            name: updatedAdmin.name,
            role: updatedAdmin.role,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Deactivate admin account (Super Admin only)
   */
  deactivateAdmin: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { adminId } = req.params;
      const requesterId = req.user?.id;

      // Verify requester is super admin
      const requester = await UserService.findUniqueUser(
        { id: requesterId },
        { role: true }
      );

      if (!requester || requester.role !== UserRole.SUPER_ADMIN) {
        throw new ApiError(
          403,
          "Only super admins can deactivate admin accounts"
        );
      }

      // Prevent self-deactivation
      if (adminId === requesterId) {
        throw new ApiError(400, "Cannot deactivate your own account");
      }

      // Check if target is admin
      const targetAdmin = await UserService.findUniqueUser(
        { id: adminId },
        { role: true }
      );

      if (
        !targetAdmin ||
        ![UserRole.ADMIN, UserRole.MODERATOR].includes(
          targetAdmin.role as UserRole
        )
      ) {
        throw new ApiError(404, "Admin user not found");
      }

      // Deactivate admin (soft delete or status change)
      await UserService.updateUser(
        { id: adminId },
        {
          verified: false,
          // You might want to add an 'active' field to your schema
          // active: false,
          deactivated_at: new Date(),
        }
      );

      // Invalidate all refresh tokens for this admin
      if (!adminId) {
        throw new ApiError(401, "Admin authentication required");
      }
      await UserService.invalidateAllRefreshTokensForUser(adminId);

      res.status(200).json({
        success: true,
        message: "Admin account deactivated successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  getAdminProfile: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const adminId = req.admin?.id;

      if (!adminId) {
        throw new ApiError(401, "Admin authentication required");
      }

      const profile = await UserService.getAdminProfile(adminId);

      if (!profile) {
        throw new ApiError(404, "Admin profile not found");
      }

      res.status(200).json({
        success: true,
        data: {
          profile: {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            phone: profile.phone,
            role: profile.role,
            verified: profile.verified,
            twoFactorEnabled: profile.two_factor_enabled,
            lastLogin: profile.last_login,
            lastActivity: profile.last_activity,
            joinedDate: profile.createdAt,
            createdBy: profile.creator
              ? {
                  name: profile.creator.name,
                  email: profile.creator.email,
                }
              : null,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  updateAdminProfile: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const adminId = req.user?.id;
      const { name, phone, email } = req.body;

      if (!adminId) {
        throw new ApiError(401, "Admin authentication required");
      }

      // If email is being updated, check if it's already taken
      if (email) {
        const existingUser = await UserService.findUniqueUser(
          { email: email.toLowerCase() },
          { id: true }
        );

        if (existingUser && existingUser.id !== adminId) {
          throw new ApiError(409, "Email is already in use");
        }
      }

      const updatedProfile = await UserService.updateAdminProfile(adminId, {
        name: name?.trim(),
        phone: phone?.trim(),
        email: email?.toLowerCase().trim(),
      });

      // Log the action
      await UserService.logAdminAction({
        adminId,
        action: "update_own_profile",
        details: {
          updatedFields: { name: !!name, phone: !!phone, email: !!email },
        },
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: {
          profile: {
            id: updatedProfile.id,
            email: updatedProfile.email,
            name: updatedProfile.name,
            phone: updatedProfile.phone,
            role: updatedProfile.role,
            verified: updatedProfile.verified,
            twoFactorEnabled: updatedProfile.two_factor_enabled,
            updatedAt: updatedProfile.updatedAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // ==================== TWO-FACTOR AUTHENTICATION ====================

  enableTwoFactorAuth: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const adminId = req.admin?.id;
      const { password } = req.body;

      if (!adminId) {
        throw new ApiError(401, "Admin authentication required");
      }

      if (!password) {
        throw new ApiError(400, "Current password is required to enable 2FA");
      }

      // Verify current password
      const admin = await UserService.findUniqueUser(
        { id: adminId },
        { password: true, two_factor_enabled: true }
      );

      if (!admin) {
        throw new ApiError(404, "Admin not found");
      }

      if (admin.two_factor_enabled) {
        throw new ApiError(400, "Two-factor authentication is already enabled");
      }

      if (!admin.password) {
        throw new ApiError(401, "Invalid email or password");
      }

      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
      }

      // Enable 2FA
      await UserService.enableTwoFactorAuth(adminId);

      // Log the action
      await UserService.logAdminAction({
        adminId,
        action: "enable_2fa",
        details: { method: "email" },
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: "Two-factor authentication enabled successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  disableTwoFactorAuth: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const adminId = req.admin?.id;
      const { otp, password } = req.body;

      if (!adminId) {
        throw new ApiError(401, "Admin authentication required");
      }

      if (!otp || !password) {
        throw new ApiError(
          400,
          "OTP and current password are required to disable 2FA"
        );
      }

      // Get admin details
      const admin = await UserService.findUniqueUser(
        { id: adminId },
        { email: true, password: true, two_factor_enabled: true }
      );

      if (!admin) {
        throw new ApiError(404, "Admin not found");
      }

      if (!admin.two_factor_enabled) {
        throw new ApiError(400, "Two-factor authentication is not enabled");
      }

      if (!admin.password) {
        throw new ApiError(401, "Invalid email or password");
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
      }

      // Verify OTP
      const isValidOTP = await UserService.verifyOTP(
        admin.email,
        otp,
        OtpType.TWO_FACTOR
      );
      if (!isValidOTP) {
        throw new ApiError(400, "Invalid or expired OTP");
      }

      // Disable 2FA
      await UserService.disableTwoFactorAuth(adminId);

      // Log the action
      await UserService.logAdminAction({
        adminId,
        action: "disable_2fa",
        details: { method: "email_otp" },
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: "Two-factor authentication disabled successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  // ==================== ADMIN DASHBOARD STATS ====================

  getAdminStats: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const adminId = req.user?.id;

      if (!adminId) {
        throw new ApiError(401, "Admin authentication required");
      }

      const stats = await UserService.getDetailedAdminStats(adminId);

      res.status(200).json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  },

  getActivityLogs: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const adminId = req.user?.id;
      const { limit = 50, adminFilter, action } = req.query;

      if (!adminId) {
        throw new ApiError(401, "Admin authentication required");
      }

      // Check if requesting logs for specific admin (Super Admin only)
      if (adminFilter && adminFilter !== adminId) {
        const requester = await UserService.findUniqueUser(
          { id: adminId },
          { role: true }
        );

        if (!requester || requester.role !== UserRole.SUPER_ADMIN) {
          throw new ApiError(
            403,
            "Only super admins can view other admin activity logs"
          );
        }
      }

      const logs = await UserService.getAdminActionLogs(
        (adminFilter as string) || adminId,
        parseInt(limit as string)
      );

      res.status(200).json({
        success: true,
        data: {
          logs: logs.map((log) => ({
            id: log.id,
            action: log.action,
            admin: {
              name: log.admin?.name,
              email: log.admin?.email,
            },
            targetUser: log.target_user
              ? {
                  name: log.target_user.name,
                  email: log.target_user.email,
                }
              : null,
            details: log.details,
            ipAddress: log.ip_address,
            status: log.status,
            createdAt: log.created_at,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  // ==================== TOKEN MANAGEMENT ====================

  refreshAdminTokens: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new ApiError(400, "Refresh token is required");
      }

      const tokens = await UserService.refreshTokens(refreshToken);

      res.status(200).json({
        success: true,
        message: "Admin tokens refreshed successfully",
        data: tokens,
      });
    } catch (error) {
      next(error);
    }
  },

  adminLogout: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const adminId = req.user?.id;
      const { refreshToken } = req.body;

      if (!adminId) {
        throw new ApiError(401, "Admin authentication required");
      }

      // Invalidate refresh token if provided
      if (refreshToken) {
        await UserService.invalidateRefreshToken(refreshToken);
      }

      // Log the action
      await UserService.logAdminAction({
        adminId,
        action: "logout",
        details: { method: "manual" },
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: "Successfully logged out",
      });
    } catch (error) {
      next(error);
    }
  },

  logoutAllDevices: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const adminId = req.user?.id;

      if (!adminId) {
        throw new ApiError(401, "Admin authentication required");
      }

      // Invalidate all refresh tokens for this admin
      await UserService.invalidateAllRefreshTokensForUser(adminId);

      // Invalidate all admin sessions
      await UserService.invalidateAllSessions(adminId);

      // Log the action
      await UserService.logAdminAction({
        adminId,
        action: "logout_all_devices",
        details: { method: "manual" },
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: "Successfully logged out from all devices",
      });
    } catch (error) {
      next(error);
    }
  },

  // ==================== ADDITIONAL ADMIN MANAGEMENT ====================

  getAdminNotifications: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const adminId = req.user?.id;
      const { unreadOnly = false } = req.query;

      if (!adminId) {
        throw new ApiError(401, "Admin authentication required");
      }

      const notifications = await UserService.getAdminNotifications(
        adminId,
        unreadOnly === "true"
      );

      res.status(200).json({
        success: true,
        data: { notifications },
      });
    } catch (error) {
      next(error);
    }
  },

  markNotificationAsRead: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { notificationId } = req.params;
      const adminId = req.user?.id;

      if (!adminId) {
        throw new ApiError(401, "Admin authentication required");
      }

      if (!notificationId) {
        throw new ApiError(400, "Notification ID is required");
      }

      await UserService.markNotificationAsRead(notificationId);

      res.status(200).json({
        success: true,
        message: "Notification marked as read",
      });
    } catch (error) {
      next(error);
    }
  },

  // ==================== SECURITY EVENTS ====================

  getSecurityEvents: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const adminId = req.user?.id;
      const { severity } = req.query;

      // Verify admin access
      const admin = await UserService.findUniqueUser(
        { id: adminId },
        { role: true }
      );

      if (
        !admin ||
        ![UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(admin.role as UserRole)
      ) {
        throw new ApiError(
          403,
          "Insufficient permissions to view security events"
        );
      }

      const events = await UserService.getUnresolvedSecurityEvents(
        severity as string
      );

      res.status(200).json({
        success: true,
        data: { events },
      });
    } catch (error) {
      next(error);
    }
  },

  resolveSecurityEvent: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { eventId } = req.params;
      const adminId = req.user?.id;
      if (!eventId) {
        throw new ApiError(401, "Admin authentication required");
      }

      if (!adminId) {
        throw new ApiError(401, "Admin authentication required");
      }

      // Verify admin access
      const admin = await UserService.findUniqueUser(
        { id: adminId },
        { role: true }
      );

      if (
        !admin ||
        ![UserRole.SUPER_ADMIN, UserRole.ADMIN].includes(admin.role as UserRole)
      ) {
        throw new ApiError(
          403,
          "Insufficient permissions to resolve security events"
        );
      }

      await UserService.resolveSecurityEvent(eventId, adminId);

      // Log the action
      await UserService.logAdminAction({
        adminId,
        action: "resolve_security_event",
        details: { eventId },
        ipAddress: req.ip,
      });

      res.status(200).json({
        success: true,
        message: "Security event resolved successfully",
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all admin users for blog author selection
   * Any admin can access this for creating blogs
   */
  getBlogAuthors: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const requesterId = req.admin?.id;

      if (!requesterId) {
        throw new ApiError(401, "Admin authentication required");
      }

      // Verify requester is at least an admin
      const requester = await UserService.findUniqueUser(
        { id: requesterId },
        { role: true }
      );

      if (
        !requester ||
        ![UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR].includes(
          requester.role as UserRole
        )
      ) {
        throw new ApiError(403, "Admin privileges required");
      }

      // Get all active admin users who can be authors
      const authors = await UserService.findManyUsers(
        {
          role: {
            in: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR],
          },
          verified: true,
          // Add any other conditions like active status if you have it
        },
        {
          id: true,
          email: true,
          name: true,
          role: true,
        }
      );

      res.status(200).json({
        success: true,
        message: "Blog authors retrieved successfully",
        data: {
          authors: authors.map((author) => ({
            id: author.id,
            name: author.name,
            email: author.email,
            role: author.role,
            displayName: `${author.name} (${author.email})`, // Useful for dropdown display
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  },
};

export default adminAuthController;
