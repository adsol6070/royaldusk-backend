import { prisma, Prisma, WishlistItem } from "@repo/database";

export const excludedFields = [
    "notificationsSent",
    "lastViewedAt",
];

export const WishlistService = {
    createWishlistItem: async (input: Prisma.WishlistItemCreateInput) => {
        return (await prisma.wishlistItem.create({
            data: input,
        })) as WishlistItem;
    },

    findWishlistItem: async (
        where: Prisma.WishlistItemWhereInput,
        select?: Prisma.WishlistItemSelect
    ) => {
        return (await prisma.wishlistItem.findFirst({
            where,
            select,
        })) as WishlistItem;
    },

    findUniqueWishlistItem: async (
        where: Prisma.WishlistItemWhereUniqueInput,
        select?: Prisma.WishlistItemSelect
    ) => {
        return (await prisma.wishlistItem.findUnique({
            where,
            select,
        })) as WishlistItem;
    },

    findManyWishlistItems: async (
        where: Prisma.WishlistItemWhereInput,
        select?: Prisma.WishlistItemSelect,
        orderBy?: Prisma.WishlistItemOrderByWithRelationInput | Prisma.WishlistItemOrderByWithRelationInput[],
        skip?: number,
        take?: number
    ) => {
        return await prisma.wishlistItem.findMany({
            where,
            select,
            orderBy,
            skip,
            take
        });
    },

    updateWishlistItem: async (
        where: Prisma.WishlistItemWhereUniqueInput,
        data: Prisma.WishlistItemUpdateInput,
        select?: Prisma.WishlistItemSelect
    ) => {
        return (await prisma.wishlistItem.update({
            where,
            data,
            select
        })) as WishlistItem;
    },

    deleteWishlistItem: async (where: Prisma.WishlistItemWhereUniqueInput) => {
        return prisma.wishlistItem.delete({ where });
    },

    deleteManyWishlistItems: async (where: Prisma.WishlistItemWhereInput) => {
        return prisma.wishlistItem.deleteMany({ where });
    },

    countWishlistItems: async (where: Prisma.WishlistItemWhereInput) => {
        return prisma.wishlistItem.count({ where });
    },

    // User wishlist operations
    getUserWishlist: async (
        userId: string,
        options?: {
            itemType?: 'Package' | 'Tour';
            priority?: 'Low' | 'Medium' | 'High';
            page?: number;
            limit?: number;
            sortBy?: 'createdAt' | 'priority' | 'updatedAt';
            sortOrder?: 'asc' | 'desc';
        }
    ) => {
        const {
            itemType,
            priority,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = options || {};

        const skip = (page - 1) * limit;

        const where: Prisma.WishlistItemWhereInput = {
            userId,
            ...(itemType && { itemType }),
            ...(priority && { priority }),
        };

        const orderBy: Prisma.WishlistItemOrderByWithRelationInput = {
            [sortBy]: sortOrder,
        };

        const [items, total] = await Promise.all([
            prisma.wishlistItem.findMany({
                where,
                orderBy,
                skip,
                take: limit,
                include: {
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
                },
            }),
            prisma.wishlistItem.count({ where }),
        ]);

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    },

    getUserWishlistCount: async (userId: string) => {
        const [total, packages, tours, lowPriority, mediumPriority, highPriority] = await Promise.all([
            prisma.wishlistItem.count({ where: { userId } }),
            prisma.wishlistItem.count({ where: { userId, itemType: 'Package' } }),
            prisma.wishlistItem.count({ where: { userId, itemType: 'Tour' } }),
            prisma.wishlistItem.count({ where: { userId, priority: 'Low' } }),
            prisma.wishlistItem.count({ where: { userId, priority: 'Medium' } }),
            prisma.wishlistItem.count({ where: { userId, priority: 'High' } }),
        ]);

        return {
            total,
            packages,
            tours,
            byPriority: {
                low: lowPriority,
                medium: mediumPriority,
                high: highPriority,
            },
        };
    },

    addToWishlist: async (data: {
        userId: string;
        itemType: 'Package' | 'Tour';
        packageId?: string;
        tourId?: string;
        priority?: 'Low' | 'Medium' | 'High';
        notes?: string;
    }) => {
        const { userId, itemType, packageId, tourId, priority = 'Medium', notes } = data;

        // Check if item already exists in wishlist
        const existingItem = await prisma.wishlistItem.findFirst({
            where: {
                userId,
                ...(itemType === 'Package' ? { packageId } : { tourId }),
            },
        });

        if (existingItem) {
            throw new Error('Item already exists in wishlist');
        }

        return prisma.wishlistItem.create({
            data: {
                userId,
                itemType,
                packageId: itemType === 'Package' ? packageId : undefined,
                tourId: itemType === 'Tour' ? tourId : undefined,
                priority,
                notes,
            },
            include: {
                package: itemType === 'Package' ? {
                    include: {
                        location: true,
                        category: true,
                    },
                } : false,
                tour: itemType === 'Tour' ? {
                    include: {
                        location: true,
                        category: true,
                    },
                } : false,
            },
        });
    },

    removeFromWishlist: async (userId: string, itemId: string) => {
        const item = await prisma.wishlistItem.findFirst({
            where: {
                id: itemId,
                userId,
            },
        });

        if (!item) {
            throw new Error('Wishlist item not found');
        }

        return prisma.wishlistItem.delete({
            where: { id: itemId },
        });
    },

    clearUserWishlist: async (userId: string) => {
        return prisma.wishlistItem.deleteMany({
            where: { userId },
        });
    },

    updateWishlistItemDetails: async (
        userId: string,
        itemId: string,
        updates: {
            priority?: 'Low' | 'Medium' | 'High';
            notes?: string;
            isNotified?: boolean;
        }
    ) => {
        const item = await prisma.wishlistItem.findFirst({
            where: {
                id: itemId,
                userId,
            },
        });

        if (!item) {
            throw new Error('Wishlist item not found');
        }

        return prisma.wishlistItem.update({
            where: { id: itemId },
            data: {
                ...updates,
                updatedAt: new Date(),
            },
            include: {
                package: item.itemType === 'Package' ? {
                    include: {
                        location: true,
                        category: true,
                    },
                } : false,
                tour: item.itemType === 'Tour' ? {
                    include: {
                        location: true,
                        category: true,
                    },
                } : false,
            },
        });
    },

    getWishlistByPriority: async (userId: string, priority: 'Low' | 'Medium' | 'High') => {
        return prisma.wishlistItem.findMany({
            where: {
                userId,
                priority,
            },
            include: {
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
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    },

    // Utility methods for data synchronization
    updateItemsOnPackageChange: async (packageId: string, changes: any) => {
        return prisma.wishlistItem.updateMany({
            where: { packageId },
            data: {
                updatedAt: new Date(),
            },
        });
    },

    updateItemsOnTourChange: async (tourId: string, changes: any) => {
        return prisma.wishlistItem.updateMany({
            where: { tourId },
            data: {
                updatedAt: new Date(),
            },
        });
    },

    removeItemsOnPackageDelete: async (packageId: string) => {
        return prisma.wishlistItem.deleteMany({
            where: { packageId },
        });
    },

    removeItemsOnTourDelete: async (tourId: string) => {
        return prisma.wishlistItem.deleteMany({
            where: { tourId },
        });
    },

    removeItemsOnUserDelete: async (userId: string) => {
        return prisma.wishlistItem.deleteMany({
            where: { userId },
        });
    },

    // Notification and tracking methods
    markNotificationSent: async (itemIds: string[]) => {
        return prisma.wishlistItem.updateMany({
            where: {
                id: { in: itemIds },
            },
            data: {
                isNotified: true,
                notificationsSent: { increment: 1 },
            },
        });
    },

    updateLastViewed: async (itemIds: string[]) => {
        return prisma.wishlistItem.updateMany({
            where: {
                id: { in: itemIds },
            },
            data: {
                lastViewedAt: new Date(),
            },
        });
    },

    // Analytics methods
    getWishlistAnalytics: async (userId?: string) => {
        const baseWhere = userId ? { userId } : {};

        const [
            totalItems,
            itemsByType,
            itemsByPriority,
            recentActivity,
        ] = await Promise.all([
            prisma.wishlistItem.count({ where: baseWhere }),
            prisma.wishlistItem.groupBy({
                by: ['itemType'],
                where: baseWhere,
                _count: true,
            }),
            prisma.wishlistItem.groupBy({
                by: ['priority'],
                where: baseWhere,
                _count: true,
            }),
            prisma.wishlistItem.count({
                where: {
                    ...baseWhere,
                    createdAt: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
                    },
                },
            }),
        ]);

        return {
            totalItems,
            itemsByType,
            itemsByPriority,
            recentActivity,
        };
    },
};