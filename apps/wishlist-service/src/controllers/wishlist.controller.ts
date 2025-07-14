import { Request, Response, NextFunction } from 'express';
import { WishlistService } from '../services/wishlist.service';
import { ApiError } from "@repo/utils/ApiError";
import { asyncHandler } from '@repo/utils/asyncHandler';
import { prisma } from '@repo/database';

interface AuthenticatedRequest extends Request {
    // Remove the user interface since it comes from res.locals now
}

interface AuthenticatedResponse extends Response {
    locals: {
        user?: {
            id: string;
            role: string;
        };
    };
}

export const WishlistController = {
    // Add item to wishlist
    addToWishlist: asyncHandler(async (req: AuthenticatedRequest, res: AuthenticatedResponse, next: NextFunction) => {
        const userId = res.locals.user?.id;
        if (!userId) {
            return next(new ApiError(401, 'User not authenticated'));
        }

        const { itemType, packageId, tourId, priority, notes } = req.body;

        // Validate required fields
        if (!itemType || (itemType === 'Package' && !packageId) || (itemType === 'Tour' && !tourId)) {
            return next(new ApiError(400, 'Invalid request data'));
        }

        try {
            const wishlistItem = await WishlistService.addToWishlist({
                userId,
                itemType,
                packageId,
                tourId,
                priority,
                notes,
            });

            res.status(201).json({
                status: 'success',
                message: 'Item added to wishlist successfully',
                data: {
                    wishlistItem,
                },
            });
        } catch (error: any) {
            if (error.message === 'Item already exists in wishlist') {
                return next(new ApiError(409, 'Item already exists in wishlist'));
            }
            throw error;
        }
    }),

    // Get user's wishlist
    getUserWishlist: asyncHandler(async (req: AuthenticatedRequest, res: AuthenticatedResponse, next: NextFunction) => {
        const userId = res.locals.user?.id;
        if (!userId) {
            return next(new ApiError(401, 'User not authenticated'));
        }

        const {
            itemType,
            priority,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = req.query;

        const options = {
            itemType: itemType as 'Package' | 'Tour' | undefined,
            priority: priority as 'Low' | 'Medium' | 'High' | undefined,
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            sortBy: sortBy as 'createdAt' | 'priority' | 'updatedAt',
            sortOrder: sortOrder as 'asc' | 'desc',
        };

        const result = await WishlistService.getUserWishlist(userId, options);

        res.status(200).json({
            status: 'success',
            message: 'Wishlist retrieved successfully',
            data: {
                ...result,
            },
        });
    }),

    // Get wishlist count and statistics
    getUserWishlistCount: asyncHandler(async (req: AuthenticatedRequest, res: AuthenticatedResponse, next: NextFunction) => {
        const userId = res.locals.user?.id;
        if (!userId) {
            return next(new ApiError(401, 'User not authenticated'));
        }

        const counts = await WishlistService.getUserWishlistCount(userId);

        res.status(200).json({
            status: 'success',
            message: 'Wishlist count retrieved successfully',
            data: {
                counts,
            },
        });
    }),

    // Get wishlist items by priority
    getWishlistByPriority: asyncHandler(async (
        req: AuthenticatedRequest & { params: { priority: 'Low' | 'Medium' | 'High' } },
        res: AuthenticatedResponse,
        next: NextFunction
    ) => {
        const userId = res.locals.user?.id;
        if (!userId) {
            return next(new ApiError(401, 'User not authenticated'));
        }

        const { priority } = req.params;

        if (!['Low', 'Medium', 'High'].includes(priority)) {
            return next(new ApiError(400, 'Invalid priority level'));
        }

        const items = await WishlistService.getWishlistByPriority(
            userId,
            priority as 'Low' | 'Medium' | 'High'
        );

        res.status(200).json({
            status: 'success',
            message: `${priority} priority items retrieved successfully`,
            data: {
                items,
                count: items.length,
            },
        });
    }),

    // Update wishlist item details
    updateWishlistItem: asyncHandler(async (req: AuthenticatedRequest, res: AuthenticatedResponse, next: NextFunction) => {
        const userId = res.locals.user?.id;
        if (!userId) {
            return next(new ApiError(401, 'User not authenticated'));
        }

        const { itemId } = req.params;
        const { priority, notes, isNotified } = req.body;

        if (!itemId) {
            return next(new ApiError(400, 'Item ID is required'));
        }

        try {
            const updatedItem = await WishlistService.updateWishlistItemDetails(userId, itemId, {
                priority,
                notes,
                isNotified,
            });

            res.status(200).json({
                status: 'success',
                message: 'Wishlist item updated successfully',
                data: {
                    wishlistItem: updatedItem,
                },
            });
        } catch (error: any) {
            if (error.message === 'Wishlist item not found') {
                return next(new ApiError(404, 'Wishlist item not found'));
            }
            throw error;
        }
    }),

    // Remove item from wishlist
    removeFromWishlist: asyncHandler(async (req: AuthenticatedRequest, res: AuthenticatedResponse, next: NextFunction) => {
        const userId = res.locals.user?.id;
        if (!userId) {
            return next(new ApiError(401, 'User not authenticated'));
        }

        const { itemId } = req.params;

        if (!itemId) {
            return next(new ApiError(400, 'Item ID is required'));
        }

        try {
            await WishlistService.removeFromWishlist(userId, itemId);

            res.status(200).json({
                status: 'success',
                message: 'Item removed from wishlist successfully',
            });
        } catch (error: any) {
            if (error.message === 'Wishlist item not found') {
                return next(new ApiError(404, 'Wishlist item not found'));
            }
            throw error;
        }
    }),

    // Clear entire wishlist
    clearWishlist: asyncHandler(async (req: AuthenticatedRequest, res: AuthenticatedResponse, next: NextFunction) => {
        const userId = res.locals.user?.id;
        if (!userId) {
            return next(new ApiError(401, 'User not authenticated'));
        }

        const result = await WishlistService.clearUserWishlist(userId);

        res.status(200).json({
            status: 'success',
            message: 'Wishlist cleared successfully',
            data: {
                deletedCount: result.count,
            },
        });
    }),

    // Get wishlist analytics
    getWishlistAnalytics: asyncHandler(async (req: AuthenticatedRequest, res: AuthenticatedResponse, next: NextFunction) => {
        const userId = res.locals.user?.id;
        const userRole = res.locals.user?.role;

        // For admin users, allow getting global analytics
        const targetUserId = userRole === 'admin' && req.query.userId
            ? req.query.userId as string
            : userId;

        if (!targetUserId) {
            return next(new ApiError(401, 'User not authenticated'));
        }

        const analytics = await WishlistService.getWishlistAnalytics(targetUserId);

        res.status(200).json({
            status: 'success',
            message: 'Wishlist analytics retrieved successfully',
            data: {
                analytics,
            },
        });
    }),

    // Get global wishlist analytics (admin only)
    getGlobalAnalytics: asyncHandler(async (req: AuthenticatedRequest, res: AuthenticatedResponse, next: NextFunction) => {
        const userRole = res.locals.user?.role;

        if (userRole !== 'admin') {
            return next(new ApiError(403, 'Access denied. Admin role required'));
        }

        const analytics = await WishlistService.getWishlistAnalytics();

        res.status(200).json({
            status: 'success',
            message: 'Global wishlist analytics retrieved successfully',
            data: {
                analytics,
            },
        });
    }),

    // Mark notifications as sent (internal use)
    markNotificationSent: asyncHandler(async (req: AuthenticatedRequest, res: AuthenticatedResponse, next: NextFunction) => {
        const userRole = res.locals.user?.role;

        if (userRole !== 'admin') {
            return next(new ApiError(403, 'Access denied. Admin role required'));
        }

        const { itemIds } = req.body;

        if (!Array.isArray(itemIds) || itemIds.length === 0) {
            return next(new ApiError(400, 'Invalid item IDs provided'));
        }

        const result = await WishlistService.markNotificationSent(itemIds);

        res.status(200).json({
            status: 'success',
            message: 'Notifications marked as sent',
            data: {
                updatedCount: result.count,
            },
        });
    }),

    // Update last viewed timestamp (internal use)
    updateLastViewed: asyncHandler(async (req: AuthenticatedRequest, res: AuthenticatedResponse, next: NextFunction) => {
        const userId = res.locals.user?.id;
        if (!userId) {
            return next(new ApiError(401, 'User not authenticated'));
        }

        const { itemIds } = req.body;

        if (!Array.isArray(itemIds) || itemIds.length === 0) {
            return next(new ApiError(400, 'Invalid item IDs provided'));
        }

        // Verify that all items belong to the user
        const userItems = await WishlistService.findManyWishlistItems(
            {
                id: { in: itemIds },
                userId,
            },
            { id: true }
        );

        if (userItems.length !== itemIds.length) {
            return next(new ApiError(403, 'Some items do not belong to the user'));
        }

        const result = await WishlistService.updateLastViewed(itemIds);

        res.status(200).json({
            status: 'success',
            message: 'Last viewed timestamps updated',
            data: {
                updatedCount: result.count,
            },
        });
    }),

    // Bulk operations
    bulkRemoveItems: asyncHandler(async (req: AuthenticatedRequest, res: AuthenticatedResponse, next: NextFunction) => {
        const userId = res.locals.user?.id;
        if (!userId) {
            return next(new ApiError(401, 'User not authenticated'));
        }

        const { itemIds } = req.body;

        if (!Array.isArray(itemIds) || itemIds.length === 0) {
            return next(new ApiError(400, 'Invalid item IDs provided'));
        }

        const result = await WishlistService.deleteManyWishlistItems({
            id: { in: itemIds },
            userId,
        });

        res.status(200).json({
            status: 'success',
            message: 'Items removed from wishlist successfully',
            data: {
                deletedCount: result.count,
            },
        });
    }),

    // Bulk update priority
    bulkUpdatePriority: asyncHandler(async (req: AuthenticatedRequest, res: AuthenticatedResponse, next: NextFunction) => {
        const userId = res.locals.user?.id;
        if (!userId) {
            return next(new ApiError(401, 'User not authenticated'));
        }

        const { itemIds, priority } = req.body;

        if (!Array.isArray(itemIds) || itemIds.length === 0) {
            return next(new ApiError(400, 'Invalid item IDs provided'));
        }

        if (!['Low', 'Medium', 'High'].includes(priority)) {
            return next(new ApiError(400, 'Invalid priority level'));
        }

        // Update only items that belong to the user
        const result = await prisma.wishlistItem.updateMany({
            where: {
                id: { in: itemIds },
                userId,
            },
            data: {
                priority,
                updatedAt: new Date(),
            },
        });

        res.status(200).json({
            status: 'success',
            message: 'Priority updated for selected items',
            data: {
                updatedCount: result.count,
            },
        });
    }),

    // Get wishlist item details
    getWishlistItem: asyncHandler(async (req: AuthenticatedRequest, res: AuthenticatedResponse, next: NextFunction) => {
        const userId = res.locals.user?.id;
        if (!userId) {
            return next(new ApiError(401, 'User not authenticated'));
        }

        const { itemId } = req.params;

        const item = await WishlistService.findWishlistItem(
            {
                id: itemId,
                userId,
            },
            {
                id: true,
                itemType: true,
                priority: true,
                notes: true,
                isNotified: true,
                createdAt: true,
                updatedAt: true,
                package: {
                    include: {
                        location: true,
                        category: true,
                    },
                },
                tour: {
                    include: {
                        location: true,
                        category: true,
                    },
                },
            }
        );

        if (!item) {
            return next(new ApiError(404, 'Wishlist item not found'));
        }

        res.status(200).json({
            status: 'success',
            message: 'Wishlist item retrieved successfully',
            data: {
                wishlistItem: item,
            },
        });
    }),

    // Check if item exists in wishlist
    checkItemInWishlist: asyncHandler(async (req: AuthenticatedRequest, res: AuthenticatedResponse, next: NextFunction) => {
        const userId = res.locals.user?.id;
        if (!userId) {
            return next(new ApiError(401, 'User not authenticated'));
        }

        const { itemType, itemId } = req.params;

        if (typeof itemType !== 'string' || !['Package', 'Tour'].includes(itemType)) {
            return next(new ApiError(400, 'Invalid item type'));
        }

        const whereCondition = {
            userId,
            ...(itemType === 'Package' ? { packageId: itemId } : { tourId: itemId }),
        };

        const existingItem = await WishlistService.findWishlistItem(whereCondition, {
            id: true,
            priority: true,
            createdAt: true,
        });

        res.status(200).json({
            status: 'success',
            message: 'Wishlist check completed',
            data: {
                inWishlist: !!existingItem,
                item: existingItem || null,
            },
        });
    }),
};