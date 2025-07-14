import express from 'express';
import { WishlistController } from '../controllers/wishlist.controller';
import { deserializeUser, requireUser, requireRole } from '@repo/auth-middleware';
import {
    validateWishlistInput,
    validateWishlistQuery,
    validateWishlistUpdate,
    validatePriorityParam,
    validateItemIdParam,
    validateCheckItemInWishlist,
    validateBulkRemoveItems,
    validateBulkUpdatePriority,
    validateMarkNotificationSent,
    validateUpdateLastViewed,
    validateAnalyticsQuery,
} from '../validations/wishlist.validator';
import config from 'config';

const router = express.Router();

// Get the public key for JWT verification from your config
const accessTokenPublicKey = Buffer.from(
    config.get<string>("accessTokenPublicKey"),
    "base64"
).toString("ascii");

// Apply authentication middleware to all routes
router.use(deserializeUser([], accessTokenPublicKey));
router.use(requireUser);

// Basic wishlist operations
router
    .route('/')
    .get(validateWishlistQuery, WishlistController.getUserWishlist)         // GET /api/v1/wishlist
    .post(validateWishlistInput, WishlistController.addToWishlist)          // POST /api/v1/wishlist
    .delete(WishlistController.clearWishlist);                              // DELETE /api/v1/wishlist

// Wishlist statistics
router.get('/count', WishlistController.getUserWishlistCount);             // GET /api/v1/wishlist/count

// Analytics endpoints
router.get('/analytics',
    validateAnalyticsQuery,
    WishlistController.getWishlistAnalytics
);                                                                         // GET /api/v1/wishlist/analytics

// Global analytics (admin only)
router.get('/analytics/global',
    requireRole(['admin']),
    WishlistController.getGlobalAnalytics
);                                                                         // GET /api/v1/wishlist/analytics/global

// Priority-based filtering
router.get('/priority/:priority',
    validatePriorityParam,
    WishlistController.getWishlistByPriority
);                                                                         // GET /api/v1/wishlist/priority/:priority

// Individual item operations
router
    .route('/item/:itemId')
    .get(validateItemIdParam, WishlistController.getWishlistItem)            // GET /api/v1/wishlist/item/:itemId
    .patch(validateWishlistUpdate, WishlistController.updateWishlistItem)    // PATCH /api/v1/wishlist/item/:itemId
    .delete(validateItemIdParam, WishlistController.removeFromWishlist);     // DELETE /api/v1/wishlist/item/:itemId

// Check if item exists in wishlist
router.get('/check/:itemType/:itemId',
    validateCheckItemInWishlist,
    WishlistController.checkItemInWishlist
);                                                                         // GET /api/v1/wishlist/check/Package/:packageId

// Bulk operations
router.post('/bulk/remove',
    validateBulkRemoveItems,
    WishlistController.bulkRemoveItems
);                                                                         // POST /api/v1/wishlist/bulk/remove

router.patch('/bulk/priority',
    validateBulkUpdatePriority,
    WishlistController.bulkUpdatePriority
);                                                                         // PATCH /api/v1/wishlist/bulk/priority

// Internal/Admin operations (require admin role)
router.patch('/notifications/sent',
    requireRole(['admin']),
    validateMarkNotificationSent,
    WishlistController.markNotificationSent
);                                                                         // PATCH /api/v1/wishlist/notifications/sent

router.patch('/last-viewed',
    validateUpdateLastViewed,
    WishlistController.updateLastViewed
);                                                                         // PATCH /api/v1/wishlist/last-viewed

export default router;