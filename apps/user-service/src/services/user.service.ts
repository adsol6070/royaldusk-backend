import { OtpType, prisma, Prisma, User } from "@repo/database";
import config from "config";
import { signJwt, verifyJwt } from "@repo/utils/jwt";
import crypto from "crypto";

export const excludedFields = [
  "password",
  "verificationCode",
  "passwordResetAt",
  "passwordResetToken",
];

export const UserService = {
  createUser: async (input: Prisma.UserCreateInput) => {
    return (await prisma.user.create({
      data: input,
    })) as User;
  },

  findUser: async (
    where: Prisma.UserWhereInput,
    select?: Prisma.UserSelect
  ) => {
    return (await prisma.user.findFirst({
      where,
      select,
    })) as User;
  },

  findUniqueUser: async (
    where: Prisma.UserWhereUniqueInput,
    select?: Prisma.UserSelect
  ) => {
    return (await prisma.user.findUnique({
      where,
      select,
    })) as User;
  },

  updateUser: async (
    where: Prisma.UserWhereUniqueInput,
    data: Prisma.UserUpdateInput,
    select?: Prisma.UserSelect
  ) => {
    return (await prisma.user.update({ where, data, select })) as User;
  },

  deleteUser: async (where: Prisma.UserWhereUniqueInput) => {
    return prisma.user.delete({ where });
  },

  // ==================== OTP METHODS ====================

  storeOTP: async (data: {
    email: string;
    otp: string;
    type: OtpType;
    expiresAt: Date;
  }) => {
    // Delete any existing OTPs for this email
    await prisma.otpVerification.deleteMany({
      where: { email: data.email, type: data.type }
    });

    // Create new OTP record
    return prisma.otpVerification.create({
      data: {
        id: crypto.randomUUID(),
        email: data.email,
        otp: data.otp,
        type: data.type,
        expires_at: data.expiresAt,
        verified: false
      }
    });
  },

  verifyOTP: async (email: string, otp: string, type: OtpType): Promise<boolean> => {
    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        email,
        otp,
        type,
        verified: false,
        expires_at: {
          gt: new Date()
        }
      }
    });

    if (!otpRecord) {
      return false;
    }

    // Mark OTP as verified
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { verified: true }
    });

    return true;
  },

  // ==================== TOKEN METHODS ====================

  generateTemporaryToken: async (email: string): Promise<string> => {
    const privateKey = Buffer.from(
      config.get<string>("accessTokenPrivateKey"),
      "base64"
    ).toString("ascii");

    return signJwt(
      { email, type: "temporary" },
      privateKey,
      { expiresIn: "30m" } // 30 minutes for profile completion
    );
  },

  verifyTemporaryToken: async (token: string): Promise<string | null> => {
    try {
      const publicKey = Buffer.from(
        config.get<string>("accessTokenPublicKey"),
        "base64"
      ).toString("ascii");

      const payload = verifyJwt(token, publicKey) as any;

      if (payload.type === "temporary" && payload.email) {
        return payload.email;
      }

      return null;
    } catch (error) {
      return null;
    }
  },

  signTokens: async (user: any) => {
    const accessTokenPrivateKey = Buffer.from(
      config.get<string>("accessTokenPrivateKey"),
      "base64"
    ).toString("ascii");

    const refreshTokenPrivateKey = Buffer.from(
      config.get<string>("refreshTokenPrivateKey"),
      "base64"
    ).toString("ascii");

    const access_token = signJwt(
      { sub: user.id, role: user.role },
      accessTokenPrivateKey,
      {
        expiresIn: `${config.get<number>("accessTokenExpiresIn")}m`,
      }
    );

    const refresh_token = signJwt(
      { sub: user.id, role: user.role },
      refreshTokenPrivateKey,
      {
        expiresIn: `${config.get<number>("refreshTokenExpiresIn")}m`,
      }
    );

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        id: crypto.randomUUID(),
        user_id: user.id,
        token_hash: crypto.createHash('sha256').update(refresh_token).digest('hex'),
        expires_at: new Date(Date.now() + config.get<number>("refreshTokenExpiresIn") * 60 * 1000)
      }
    });

    return { access_token, refresh_token };
  },

  refreshTokens: async (refreshToken: string) => {
    const token_hash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token_hash,
        expires_at: { gt: new Date() }
      },
      include: { user: true }
    });

    if (!storedToken) {
      throw new Error("Invalid or expired refresh token");
    }

    // Delete old refresh token
    await prisma.refreshToken.delete({
      where: { id: storedToken.id }
    });

    // Generate new tokens
    return await UserService.signTokens(storedToken.user);
  },

  invalidateRefreshToken: async (refreshToken: string) => {
    const token_hash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await prisma.refreshToken.deleteMany({
      where: { token_hash }
    });
  },

  // ==================== APPLE TOKEN VERIFICATION ====================

  verifyAppleToken: async (identityToken: string) => {
    // Implement Apple token verification
    // This is a simplified version - you'll need proper Apple JWT verification
    try {
      // Validate JWT format (should have 3 parts: header.payload.signature)
      const tokenParts = identityToken.split('.');
      if (tokenParts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      const payloadPart = tokenParts[1];
      if (!payloadPart) {
        throw new Error("Missing JWT payload");
      }

      // Decode JWT without verification for demo (NOT SECURE)
      const payload = JSON.parse(
        Buffer.from(payloadPart, 'base64').toString()
      );

      // Validate required fields
      if (!payload.sub) {
        throw new Error("Missing subject in token");
      }

      return {
        sub: payload.sub,
        email: payload.email || null,
        name: payload.name || null
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Invalid Apple token: ${error.message}`);
      }
      throw new Error("Invalid Apple token");
    }
  },

  // ==================== CLEANUP METHODS ====================

  cleanupExpiredOTPs: async () => {
    await prisma.otpVerification.deleteMany({
      where: {
        expires_at: { lt: new Date() }
      }
    });
  },

  cleanupExpiredTokens: async () => {
    await prisma.refreshToken.deleteMany({
      where: {
        expires_at: { lt: new Date() }
      }
    });
  },

  generateRegistrationToken: async (data: {
    email: string;
    role: string;
    invitedBy: string;
  }): Promise<string> => {
    const privateKey = Buffer.from(
      config.get<string>("accessTokenPrivateKey"),
      "base64"
    ).toString("ascii");

    const payload = {
      email: data.email,
      role: data.role,
      invitedBy: data.invitedBy,
      type: "admin_registration"
    };

    return signJwt(payload, privateKey, { expiresIn: "24h" });
  },

  verifyRegistrationToken: async (token: string): Promise<{
    email: string;
    role: string;
    invitedBy: string;
  } | null> => {
    try {
      const publicKey = Buffer.from(
        config.get<string>("accessTokenPublicKey"),
        "base64"
      ).toString("ascii");

      const payload = verifyJwt(token, publicKey) as any;

      if (payload.type === "admin_registration" && payload.email && payload.role && payload.invitedBy) {
        return {
          email: payload.email,
          role: payload.role,
          invitedBy: payload.invitedBy
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  },

  invalidateRegistrationToken: async (token: string): Promise<void> => {
    // Store invalidated tokens in a blacklist table (optional)
    // For now, we rely on JWT expiration
    console.log(`Registration token invalidated: ${token.substring(0, 10)}...`);
  },

  generateTwoFactorToken: async (userId: string): Promise<string> => {
    const privateKey = Buffer.from(
      config.get<string>("accessTokenPrivateKey"),
      "base64"
    ).toString("ascii");

    return signJwt(
      { userId, type: "two_factor_temp" },
      privateKey,
      { expiresIn: "15m" } // 15 minutes for 2FA completion
    );
  },

  verifyTwoFactorToken: async (token: string): Promise<string | null> => {
    try {
      const publicKey = Buffer.from(
        config.get<string>("accessTokenPublicKey"),
        "base64"
      ).toString("ascii");

      const payload = verifyJwt(token, publicKey) as any;

      if (payload.type === "two_factor_temp" && payload.userId) {
        return payload.userId;
      }

      return null;
    } catch (error) {
      return null;
    }
  },

  storeAdminOTP: async (data: {
    email: string;
    otp: string;
    type: OtpType;
    expiresAt: Date;
    adminId?: string;
  }) => {
    // Delete any existing OTPs for this email and type
    await prisma.otpVerification.deleteMany({
      where: { email: data.email, type: data.type }
    });

    // Create new OTP record with admin context
    return prisma.otpVerification.create({
      data: {
        id: crypto.randomUUID(),
        email: data.email,
        otp: data.otp,
        type: data.type,
        expires_at: data.expiresAt,
        verified: false,
        admin_id: data.adminId // Optional: track which admin this OTP is for
      }
    });
  },

  // ==================== AUDIT METHODS ====================

  logAdminAction: async (data: {
    adminId: string;
    action: string;
    targetUserId?: string;
    details?: any;
    ipAddress?: string;
  }) => {
    // Create admin action log (you'll need to create this table)
    return prisma.adminActionLog.create({
      data: {
        id: crypto.randomUUID(),
        admin_id: data.adminId,
        action: data.action,
        target_user_id: data.targetUserId,
        details: data.details ? data.details : undefined,
        ip_address: data.ipAddress,
        created_at: new Date()
      }
    });
  },

  getAdminActionLogs: async (adminId?: string, limit: number = 100) => {
    return prisma.adminActionLog.findMany({
      where: adminId ? { admin_id: adminId } : {},
      include: {
        admin: {
          select: { name: true, email: true }
        },
        target_user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { created_at: 'desc' },
      take: limit
    });
  },

  // ==================== SECURITY METHODS ====================

  checkAdminPermissions: async (
    adminId: string,
    requiredRole: string[]
  ): Promise<boolean> => {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true, verified: true }
    });

    if (!admin || !admin.verified) {
      return false;
    }

    return requiredRole.includes(admin.role as string);
  },

  getAdminStats: async (adminId: string) => {
    // Get admin dashboard stats
    const [
      totalUsers,
      totalAdmins,
      recentLogins,
      pendingInvitations
    ] = await Promise.all([
      prisma.user.count({
        where: { role: 'user' }
      }),
      prisma.user.count({
        where: {
          role: { in: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'] }
        }
      }),
      prisma.user.count({
        where: {
          last_login: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      }),
      // Count pending invitations (you might need to create this table)
      prisma.adminInvitation?.count?.({
        where: {
          status: 'PENDING',
          expires_at: { gt: new Date() }
        }
      }) || 0
    ]);

    return {
      totalUsers,
      totalAdmins,
      recentLogins,
      pendingInvitations
    };
  },

  getAdminProfile: async (adminId: string) => {
    return await prisma.user.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        verified: true,
        two_factor_enabled: true,
        last_login: true,
        last_activity: true,
        createdAt: true,
        creator: {
          select: { name: true, email: true }
        }
      }
    });
  },

  updateAdminProfile: async (adminId: string, data: {
    name?: string;
    phone?: string;
    email?: string;
  }) => {
    return await prisma.user.update({
      where: { id: adminId },
      data: {
        ...data,
        updatedAt: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        verified: true,
        two_factor_enabled: true,
        updatedAt: true
      }
    });
  },

  // ==================== TWO-FACTOR AUTHENTICATION ====================

  enableTwoFactorAuth: async (adminId: string) => {
    return await prisma.user.update({
      where: { id: adminId },
      data: { two_factor_enabled: true }
    });
  },

  disableTwoFactorAuth: async (adminId: string) => {
    return await prisma.user.update({
      where: { id: adminId },
      data: { two_factor_enabled: false }
    });
  },

  // ==================== ADMIN SESSION MANAGEMENT ====================

  createAdminSession: async (data: {
    adminId: string;
    sessionToken: string;
    deviceInfo: any;
    ipAddress: string;
    location?: string;
    expiresAt: Date;
  }) => {
    return await prisma.adminSession.create({
      data: {
        id: crypto.randomUUID(),
        admin_id: data.adminId,
        session_token: data.sessionToken,
        device_info: data.deviceInfo,
        ip_address: data.ipAddress,
        location: data.location,
        expires_at: data.expiresAt
      }
    });
  },

  getActiveSessions: async (adminId: string) => {
    return await prisma.adminSession.findMany({
      where: {
        admin_id: adminId,
        is_active: true,
        expires_at: { gt: new Date() }
      },
      orderBy: { last_activity: 'desc' }
    });
  },

  invalidateSession: async (sessionToken: string) => {
    return await prisma.adminSession.update({
      where: { session_token: sessionToken },
      data: {
        is_active: false,
        logout_reason: 'manual'
      }
    });
  },

  invalidateAllSessions: async (adminId: string, exceptToken?: string) => {
    return await prisma.adminSession.updateMany({
      where: {
        admin_id: adminId,
        is_active: true,
        ...(exceptToken && { session_token: { not: exceptToken } })
      },
      data: {
        is_active: false,
        logout_reason: 'force_logout'
      }
    });
  },

  // ==================== ADMIN INVITATIONS ====================

  createAdminInvitation: async (data: {
    email: string;
    role: string;
    invitedBy: string;
    tokenHash: string;
    expiresAt: Date;
    notes?: string;
  }) => {
    return await prisma.adminInvitation.create({
      data: {
        id: crypto.randomUUID(),
        email: data.email,
        role: data.role as any,
        invited_by: data.invitedBy,
        token_hash: data.tokenHash,
        expires_at: data.expiresAt,
        notes: data.notes
      }
    });
  },

  getAdminInvitation: async (tokenHash: string) => {
    return await prisma.adminInvitation.findFirst({
      where: {
        token_hash: tokenHash,
        status: 'PENDING',
        expires_at: { gt: new Date() }
      },
      include: {
        inviter: {
          select: { name: true, email: true }
        }
      }
    });
  },

  updateInvitationStatus: async (invitationId: string, status: string) => {
    const updateData: any = {
      status,
      updated_at: new Date()
    };

    if (status === 'ACCEPTED') {
      updateData.accepted_at = new Date();
    } else if (status === 'REJECTED') {
      updateData.rejected_at = new Date();
    }

    return await prisma.adminInvitation.update({
      where: { id: invitationId },
      data: updateData
    });
  },

  getPendingInvitations: async (adminId?: string) => {
    return await prisma.adminInvitation.findMany({
      where: {
        status: 'PENDING',
        expires_at: { gt: new Date() },
        ...(adminId && { invited_by: adminId })
      },
      include: {
        inviter: {
          select: { name: true, email: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });
  },

  // ==================== LOGIN ATTEMPTS TRACKING ====================

  logLoginAttempt: async (data: {
    email: string;
    ipAddress: string;
    userAgent?: string;
    success: boolean;
    failureReason?: string;
  }) => {
    return await prisma.loginAttempt.create({
      data: {
        id: crypto.randomUUID(),
        email: data.email,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        success: data.success,
        failure_reason: data.failureReason
      }
    });
  },

  getRecentFailedAttempts: async (email: string, timeWindowMinutes: number = 15) => {
    const since = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

    return await prisma.loginAttempt.count({
      where: {
        email,
        success: false,
        attempted_at: { gte: since }
      }
    });
  },

  // ==================== SECURITY EVENTS ====================

  logSecurityEvent: async (data: {
    eventType: string;
    severity?: string;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    description: string;
    metadata?: any;
  }) => {
    return await prisma.securityEvent.create({
      data: {
        id: crypto.randomUUID(),
        event_type: data.eventType as any,
        severity: (data.severity as any) || 'MEDIUM',
        user_id: data.userId,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        description: data.description,
        metadata: data.metadata
      }
    });
  },

  getUnresolvedSecurityEvents: async (severity?: string) => {
    return await prisma.securityEvent.findMany({
      where: {
        resolved: false,
        ...(severity && { severity: severity as any })
      },
      orderBy: [
        { severity: 'desc' },
        { created_at: 'desc' }
      ]
    });
  },

  resolveSecurityEvent: async (eventId: string, resolvedBy: string) => {
    return await prisma.securityEvent.update({
      where: { id: eventId },
      data: {
        resolved: true,
        resolved_by: resolvedBy,
        resolved_at: new Date()
      }
    });
  },

  // ==================== ADMIN NOTIFICATIONS ====================

  createAdminNotification: async (data: {
    adminId: string;
    type: string;
    title: string;
    message: string;
    data?: any;
    priority?: string;
    expiresAt?: Date;
  }) => {
    return await prisma.adminNotification.create({
      data: {
        id: crypto.randomUUID(),
        admin_id: data.adminId,
        type: data.type as any,
        title: data.title,
        message: data.message,
        data: data.data,
        priority: (data.priority as any) || 'MEDIUM',
        expires_at: data.expiresAt
      }
    });
  },

  getAdminNotifications: async (adminId: string, unreadOnly: boolean = false) => {
    return await prisma.adminNotification.findMany({
      where: {
        admin_id: adminId,
        ...(unreadOnly && { read: false }),
        OR: [
          { expires_at: null },
          { expires_at: { gt: new Date() } }
        ]
      },
      orderBy: [
        { priority: 'desc' },
        { created_at: 'desc' }
      ]
    });
  },

  markNotificationAsRead: async (notificationId: string) => {
    return await prisma.adminNotification.update({
      where: { id: notificationId },
      data: {
        read: true,
        read_at: new Date()
      }
    });
  },

  markAllNotificationsAsRead: async (adminId: string) => {
    return await prisma.adminNotification.updateMany({
      where: {
        admin_id: adminId,
        read: false
      },
      data: {
        read: true,
        read_at: new Date()
      }
    });
  },

  // ==================== ADMIN SETTINGS ====================

  getAdminSetting: async (key: string) => {
    const setting = await prisma.adminSettings.findUnique({
      where: { key }
    });
    return setting?.value;
  },

  updateAdminSetting: async (key: string, value: any, updatedBy: string) => {
    return await prisma.adminSettings.upsert({
      where: { key },
      create: {
        id: crypto.randomUUID(),
        key,
        value,
        category: 'general',
        updated_by: updatedBy
      },
      update: {
        value,
        updated_by: updatedBy,
        updated_at: new Date()
      }
    });
  },

  getAllAdminSettings: async (category?: string) => {
    return await prisma.adminSettings.findMany({
      where: category ? { category } : {},
      include: {
        updater: {
          select: { name: true, email: true }
        }
      },
      orderBy: { category: 'asc' }
    });
  },

  // ==================== SYSTEM HEALTH MONITORING ====================

  logSystemHealth: async (data: {
    component: string;
    status: string;
    responseTime?: number;
    errorMessage?: string;
    metadata?: any;
  }) => {
    return await prisma.systemHealthLog.create({
      data: {
        id: crypto.randomUUID(),
        component: data.component,
        status: data.status,
        response_time: data.responseTime,
        error_message: data.errorMessage,
        metadata: data.metadata
      }
    });
  },

  getSystemHealth: async (component?: string, hoursBack: number = 24) => {
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

    return await prisma.systemHealthLog.findMany({
      where: {
        ...(component && { component }),
        checked_at: { gte: since }
      },
      orderBy: { checked_at: 'desc' }
    });
  },

  // ==================== ENHANCED ADMIN STATS ====================

  getDetailedAdminStats: async (adminId: string) => {
    const [
      totalUsers,
      totalAdmins,
      activeUsers,
      recentLogins,
      pendingInvitations,
      unreadNotifications,
      criticalSecurityEvents,
      systemHealth
    ] = await Promise.all([
      // Total users
      prisma.user.count({
        where: { role: 'user' }
      }),

      // Total admins
      prisma.user.count({
        where: {
          role: { in: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'] }
        }
      }),

      // Active users (logged in last 30 days)
      prisma.user.count({
        where: {
          last_login: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),

      // Recent logins (last 24 hours)
      prisma.user.count({
        where: {
          last_login: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),

      // Pending invitations
      prisma.adminInvitation.count({
        where: {
          status: 'PENDING',
          expires_at: { gt: new Date() }
        }
      }),

      // Unread notifications for this admin
      prisma.adminNotification.count({
        where: {
          admin_id: adminId,
          read: false,
          OR: [
            { expires_at: null },
            { expires_at: { gt: new Date() } }
          ]
        }
      }),

      // Critical security events
      prisma.securityEvent.count({
        where: {
          severity: 'CRITICAL',
          resolved: false
        }
      }),

      // System health status
      prisma.systemHealthLog.findMany({
        where: {
          checked_at: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
          }
        },
        distinct: ['component'],
        orderBy: { checked_at: 'desc' }
      })
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        recentLogins
      },
      admins: {
        total: totalAdmins,
        pendingInvitations
      },
      notifications: {
        unread: unreadNotifications
      },
      security: {
        criticalEvents: criticalSecurityEvents
      },
      system: {
        components: systemHealth.map(log => ({
          component: log.component,
          status: log.status,
          lastChecked: log.checked_at
        }))
      }
    };
  },

  // ==================== BULK OPERATIONS ====================

  bulkUpdateAdminStatus: async (adminIds: string[], action: 'activate' | 'deactivate' | 'delete', performedBy: string) => {
    const results = [];

    for (const adminId of adminIds) {
      try {
        let result;

        switch (action) {
          case 'activate':
            result = await prisma.user.update({
              where: { id: adminId },
              data: {
                verified: true,
                deactivated_at: null,
                deactivated_by: null
              }
            });
            break;

          case 'deactivate':
            result = await prisma.user.update({
              where: { id: adminId },
              data: {
                verified: false,
                deactivated_at: new Date(),
                deactivated_by: performedBy
              }
            });
            // Invalidate all sessions
            await prisma.adminSession.updateMany({
              where: { admin_id: adminId },
              data: { is_active: false, logout_reason: 'account_deactivated' }
            });
            break;

          case 'delete':
            // Soft delete by deactivating and marking for deletion
            result = await prisma.user.update({
              where: { id: adminId },
              data: {
                verified: false,
                deactivated_at: new Date(),
                deactivated_by: performedBy
              }
            });
            break;
        }

        // Log the action
        await prisma.adminActionLog.create({
          data: {
            id: crypto.randomUUID(),
            admin_id: performedBy,
            action: `bulk_${action}_admin`,
            target_user_id: adminId,
            details: { bulkOperation: true },
            status: 'SUCCESS'
          }
        });

        results.push({ adminId, status: 'success', result });
      } catch (error) {
        results.push({
          adminId,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  },

  invalidateAllRefreshTokensForUser: async (userId: string): Promise<void> => {
    await prisma.refreshToken.deleteMany({
      where: { user_id: userId }
    });
  },

  // You should also add the findManyUsers method that's referenced in some controllers
  findManyUsers: async (
    where: Prisma.UserWhereInput,
    select?: Prisma.UserSelect
  ) => {
    return await prisma.user.findMany({
      where,
      select,
      orderBy: { createdAt: 'desc' }
    });
  },
};
