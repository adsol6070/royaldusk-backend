import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/user.service";
import { ApiError } from "@repo/utils/ApiError";

// Admin role enum
export enum UserRole {
    SUPER_ADMIN = "SUPER_ADMIN",
    ADMIN = "ADMIN",
    MODERATOR = "MODERATOR",
    USER = "USER"
}

// Extend Express Request interface for admin context
declare global {
    namespace Express {
        interface AdminPayload {
            id: string;
            email: string;
            role: UserRole;
            name?: string;
            permissions?: string[];
        }
        interface Request {
            admin?: AdminPayload;
        }
    }
}

/**
 * Middleware to require Super Admin role
 */
export const requireSuperAdmin = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = res.locals.user?.id;

        if (!userId) {
            throw new ApiError(401, "Authentication required");
        }

        const user = await UserService.findUniqueUser(
            { id: userId },
            {
                id: true,
                email: true,
                name: true,
                role: true,
                verified: true
            }
        );

        if (!user || !user.verified) {
            throw new ApiError(401, "User not found or not verified");
        }

        if (user.role !== UserRole.SUPER_ADMIN) {
            throw new ApiError(403, "Super Admin access required");
        }

        // Add admin info to request
        req.admin = {
            id: user.id,
            email: user.email,
            role: user.role as UserRole,
            name: user.name ?? undefined
        };

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware to require Admin role (SUPER_ADMIN, ADMIN, or MODERATOR)
 */
export const requireAdmin = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = res.locals.user?.id;

        if (!userId) {
            throw new ApiError(401, "Authentication required");
        }

        const user = await UserService.findUniqueUser(
            { id: userId },
            {
                id: true,
                email: true,
                name: true,
                role: true,
                verified: true
            }
        );

        if (!user || !user.verified) {
            throw new ApiError(401, "User not found or not verified");
        }

        const adminRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR];
        if (!adminRoles.includes(user.role as UserRole)) {
            throw new ApiError(403, "Admin access required");
        }

        // Add admin info to request
        req.admin = {
            id: user.id,
            email: user.email,
            role: user.role as UserRole,
            name: user.name ?? undefined
        };

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware to require specific admin role
 */
export const requireRole = (allowedRoles: UserRole[]) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.id;

            if (!userId) {
                throw new ApiError(401, "Authentication required");
            }

            const user = await UserService.findUniqueUser(
                { id: userId },
                {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    verified: true
                }
            );

            if (!user || !user.verified) {
                throw new ApiError(401, "User not found or not verified");
            }

            if (!allowedRoles.includes(user.role as UserRole)) {
                throw new ApiError(403, `Access denied. Required roles: ${allowedRoles.join(', ')}`);
            }

            // Add admin info to request
            req.admin = {
                id: user.id,
                email: user.email,
                role: user.role as UserRole,
                name: user.name ?? undefined
            };

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Middleware to validate admin authentication status
 */
export const validateAdminAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            throw new ApiError(401, "Authentication required");
        }

        const user = await UserService.findUniqueUser(
            { id: userId },
            {
                id: true,
                email: true,
                name: true,
                role: true,
                verified: true,
                two_factor_enabled: true,
                last_login: true
            }
        );

        if (!user || !user.verified) {
            throw new ApiError(401, "User not found or not verified");
        }

        // Check if user is admin
        const adminRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR];
        if (!adminRoles.includes(user.role as UserRole)) {
            throw new ApiError(403, "Admin access required");
        }

        // Add admin info to request
        req.admin = {
            id: user.id,
            email: user.email,
            role: user.role as UserRole,
            name: user.name ?? undefined
        };

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware to check permissions for specific actions
 */
export const checkPermissions = (requiredPermissions: string[]) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const adminRole = req.admin?.role;

            if (!adminRole) {
                throw new ApiError(401, "Admin authentication required");
            }

            // Define role-based permissions
            const rolePermissions: Record<Exclude<UserRole, UserRole.USER>, string[]> = {
                [UserRole.SUPER_ADMIN]: [
                    'users.read', 'users.write', 'users.delete',
                    'admins.read', 'admins.write', 'admins.delete',
                    'settings.read', 'settings.write',
                    'reports.read', 'reports.write',
                    'system.read', 'system.write'
                ],
                [UserRole.ADMIN]: [
                    'users.read', 'users.write',
                    'reports.read', 'reports.write',
                    'settings.read'
                ],
                [UserRole.MODERATOR]: [
                    'users.read',
                    'reports.read'
                ]
            };

            const isAdminRole = adminRole === UserRole.SUPER_ADMIN || adminRole === UserRole.ADMIN || adminRole === UserRole.MODERATOR;
            const userPermissions = isAdminRole ? rolePermissions[adminRole] : [];
            const hasRequiredPermissions = requiredPermissions.every(
                permission => userPermissions.includes(permission)
            );

            if (!hasRequiredPermissions) {
                throw new ApiError(403, `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`);
            }

            // Add permissions to request
            req.admin!.permissions = userPermissions;

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Middleware to log admin actions for audit trail
 */
export const logAdminAction = (action: string) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const adminId = req.admin?.id;
            const ipAddress = req.ip || req.connection.remoteAddress;

            if (adminId) {
                // Log the action (implement this method in UserService)
                await UserService.logAdminAction({
                    adminId,
                    action,
                    details: {
                        method: req.method,
                        url: req.originalUrl,
                        body: req.method !== 'GET' ? req.body : undefined,
                        params: req.params,
                        query: req.query
                    },
                    ipAddress
                });
            }

            next();
        } catch (error) {
            // Don't fail the request if logging fails
            console.error('Failed to log admin action:', error);
            next();
        }
    };
};

/**
 * Middleware to enforce session timeout for admin users
 */
export const enforceSessionTimeout = (timeoutMinutes: number = 120) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.id;

            if (!userId) {
                throw new ApiError(401, "Authentication required");
            }

            const user = await UserService.findUniqueUser(
                { id: userId },
                { last_activity: true }
            );

            if (user && user.last_activity) {
                const timeSinceLastActivity = Date.now() - new Date(user.last_activity).getTime();
                const timeoutMs = timeoutMinutes * 60 * 1000;

                if (timeSinceLastActivity > timeoutMs) {
                    // Invalidate all tokens for this user
                    await UserService.invalidateAllRefreshTokensForUser(userId);
                    throw new ApiError(401, "Session expired due to inactivity");
                }
            }

            // Update last activity
            await UserService.updateUser(
                { id: userId },
                { last_activity: new Date() }
            );

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Middleware to prevent actions on self
 */
export const preventSelfAction = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const adminId = req.admin?.id;
        const targetUserId = req.params.adminId || req.body.adminId || req.params.userId;

        if (adminId === targetUserId) {
            throw new ApiError(400, "Cannot perform this action on your own account");
        }

        next();
    } catch (error) {
        next(error);
    }
};