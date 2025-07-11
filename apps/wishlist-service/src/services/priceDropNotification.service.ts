// // services/priceDropNotification.service.ts
// import { cacheService } from "./cache.service";
// import { rabbitMQ } from "./rabbitmq.service";
// import { WishlistService } from "./wishlist.service";

// interface PriceDropNotification {
//     userId: string;
//     itemId: string;
//     itemType: 'Package' | 'Tour';
//     oldPrice: number;
//     newPrice: number;
//     savingsAmount: number;
// }

// interface NotificationPreferences {
//     priceDropEnabled: boolean;
//     emailEnabled: boolean;
//     pushEnabled: boolean;
//     frequency: 'Immediate' | 'Daily' | 'Weekly' | 'Never';
// }

// class PriceDropNotificationService {
//     private isRunning = false;
//     private notificationQueue: PriceDropNotification[] = [];
//     private processingInterval: NodeJS.Timeout | null = null;

//     async start(): Promise<void> {
//         if (this.isRunning) {
//             console.log("PriceDropNotificationService is already running");
//             return;
//         }

//         try {
//             // Set up notification consumer
//             await this.setupNotificationConsumer();

//             // Start periodic processing for batched notifications
//             this.startPeriodicProcessing();

//             this.isRunning = true;
//             console.log("PriceDropNotificationService started successfully");
//         } catch (error) {
//             console.error("Failed to start PriceDropNotificationService:", error);
//             throw error;
//         }
//     }

//     async stop(): Promise<void> {
//         if (!this.isRunning) {
//             return;
//         }

//         try {
//             // Stop periodic processing
//             if (this.processingInterval) {
//                 clearInterval(this.processingInterval);
//                 this.processingInterval = null;
//             }

//             // Process remaining notifications
//             await this.processQueuedNotifications();

//             // Close consumer
//             await rabbitMQ.closeConsumer('price.drop.notifications');

//             this.isRunning = false;
//             console.log("PriceDropNotificationService stopped successfully");
//         } catch (error) {
//             console.error("Error stopping PriceDropNotificationService:", error);
//             throw error;
//         }
//     }

//     async queuePriceDropNotification(notification: PriceDropNotification): Promise<void> {
//         try {
//             // Get user notification preferences
//             const preferences = await this.getUserNotificationPreferences(notification.userId);

//             if (!preferences.priceDropEnabled || preferences.frequency === 'Never') {
//                 console.log(`Price drop notifications disabled for user ${notification.userId}`);
//                 return;
//             }

//             // Check if we should send immediate notification
//             if (preferences.frequency === 'Immediate') {
//                 await this.sendImmediateNotification(notification, preferences);
//             } else {
//                 // Queue for batch processing
//                 await this.queueBatchNotification(notification, preferences.frequency);
//             }

//             console.log(`Price drop notification queued for user ${notification.userId}`);
//         } catch (error) {
//             console.error("Error queuing price drop notification:", error);
//             throw error;
//         }
//     }

//     private async setupNotificationConsumer(): Promise<void> {
//         await rabbitMQ.consume(
//             'price.drop.notifications',
//             'wishlist.price.drop.queue',
//             async (message: any) => {
//                 try {
//                     const notification: PriceDropNotification = JSON.parse(message.content.toString());
//                     await this.queuePriceDropNotification(notification);
//                 } catch (error) {
//                     console.error("Error processing price drop notification:", error);
//                 }
//             },
//             {
//                 durable: true,
//                 prefetch: 20
//             }
//         );
//     }

//     private startPeriodicProcessing(): void {
//         // Process batched notifications every 5 minutes
//         this.processingInterval = setInterval(async () => {
//             try {
//                 await this.processQueuedNotifications();
//             } catch (error) {
//                 console.error("Error in periodic notification processing:", error);
//             }
//         }, 5 * 60 * 1000); // 5 minutes
//     }

//     private async processQueuedNotifications(): Promise<void> {
//         if (this.notificationQueue.length === 0) {
//             return;
//         }

//         console.log(`Processing ${this.notificationQueue.length} queued notifications`);

//         const notifications = [...this.notificationQueue];
//         this.notificationQueue = [];

//         for (const notification of notifications) {
//             try {
//                 await this.processNotification(notification);
//             } catch (error) {
//                 console.error(`Error processing notification for user ${notification.userId}:`, error);
//                 // Re-queue failed notification for retry
//                 this.notificationQueue.push(notification);
//             }
//         }
//     }

//     private async sendImmediateNotification(
//         notification: PriceDropNotification,
//         preferences: NotificationPreferences
//     ): Promise<void> {
//         try {
//             // Send notification through message queue to notification service
//             await rabbitMQ.publish('user.notifications', {
//                 type: 'PRICE_DROP_ALERT',
//                 userId: notification.userId,
//                 data: {
//                     itemType: notification.itemType,
//                     oldPrice: notification.oldPrice,
//                     newPrice: notification.newPrice,
//                     savingsAmount: notification.savingsAmount,
//                     channels: {
//                         email: preferences.emailEnabled,
//                         push: preferences.pushEnabled
//                     }
//                 },
//                 timestamp: new Date()
//             });

//             // Mark as notified in wishlist
//             await WishlistService.markNotificationSent([notification.itemId]);

//             console.log(`Immediate price drop notification sent to user ${notification.userId}`);
//         } catch (error) {
//             console.error(`Error sending immediate notification to user ${notification.userId}:`, error);
//             throw error;
//         }
//     }

//     private async queueBatchNotification(
//         notification: PriceDropNotification,
//         frequency: 'Daily' | 'Weekly'
//     ): Promise<void> {
//         try {
//             // Store in cache for batch processing
//             const cacheKey = `batch_notifications:${frequency}:${notification.userId}`;
//             const existing = await cacheService.get(cacheKey) || [];

//             existing.push({
//                 ...notification,
//                 queuedAt: new Date()
//             });

//             // Set TTL based on frequency
//             const ttl = frequency === 'Daily' ? 24 * 60 * 60 : 7 * 24 * 60 * 60; // seconds
//             await cacheService.setWithTTL(cacheKey, existing, ttl);

//             console.log(`Notification queued for ${frequency} batch processing for user ${notification.userId}`);
//         } catch (error) {
//             console.error(`Error queuing batch notification for user ${notification.userId}:`, error);
//             throw error;
//         }
//     }

//     private async processNotification(notification: PriceDropNotification): Promise<void> {
//         try {
//             // Get fresh user preferences
//             const preferences = await this.getUserNotificationPreferences(notification.userId);

//             if (!preferences.priceDropEnabled) {
//                 return;
//             }

//             // Check if user still has this item in wishlist
//             const wishlistItem = await WishlistService.findWishlistItem(
//                 { id: notification.itemId },
//                 { id: true, isNotified: true }
//             );

//             if (!wishlistItem || wishlistItem.isNotified) {
//                 return; // Item removed or already notified
//             }

//             // Send notification
//             await this.sendImmediateNotification(notification, preferences);
//         } catch (error) {
//             console.error(`Error processing notification for user ${notification.userId}:`, error);
//             throw error;
//         }
//     }

//     private async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
//         try {
//             // Try to get from cache first
//             const cacheKey = `user_preferences:${userId}`;
//             let preferences = await cacheService.get(cacheKey) as NotificationPreferences | null;

//             if (!preferences) {
//                 // Fetch from user service or database
//                 // This would typically call the user service API
//                 preferences = await this.fetchUserPreferencesFromService(userId);

//                 // Cache for 1 hour
//                 await cacheService.setWithTTL(cacheKey, preferences, 3600);
//             }

//             return preferences;
//         } catch (error) {
//             console.error(`Error getting user preferences for ${userId}:`, error);
//             // Return default preferences
//             return {
//                 priceDropEnabled: true,
//                 emailEnabled: true,
//                 pushEnabled: true,
//                 frequency: 'Immediate'
//             };
//         }
//     }

//     private async fetchUserPreferencesFromService(userId: string): Promise<NotificationPreferences> {
//         try {
//             // This would make an API call to your user service
//             // For now, return default preferences
//             return {
//                 priceDropEnabled: true,
//                 emailEnabled: true,
//                 pushEnabled: true,
//                 frequency: 'Immediate'
//             };
//         } catch (error) {
//             console.error(`Error fetching user preferences for ${userId}:`, error);
//             throw error;
//         }
//     }

//     // Public methods for manual triggering
//     async sendWelcomeNotification(userId: string): Promise<void> {
//         try {
//             await rabbitMQ.publish('user.notifications', {
//                 type: 'WISHLIST_WELCOME',
//                 userId,
//                 data: {
//                     message: 'Welcome to wishlists! Get notified when prices drop.',
//                 },
//                 timestamp: new Date()
//             });

//             console.log(`Welcome notification sent to user ${userId}`);
//         } catch (error) {
//             console.error(`Error sending welcome notification to user ${userId}:`, error);
//         }
//     }

//     async sendWeeklyDigest(userId: string): Promise<void> {
//         try {
//             // Get user's wishlist analytics
//             const analytics = await WishlistService.getWishlistAnalytics(userId);

//             await rabbitMQ.publish('user.notifications', {
//                 type: 'WISHLIST_WEEKLY_DIGEST',
//                 userId,
//                 data: {
//                     analytics,
//                     message: 'Your weekly wishlist summary',
//                 },
//                 timestamp: new Date()
//             });

//             console.log(`Weekly digest sent to user ${userId}`);
//         } catch (error) {
//             console.error(`Error sending weekly digest to user ${userId}:`, error);
//         }
//     }

//     // Analytics and monitoring
//     async getNotificationStats(): Promise<any> {
//         try {
//             const stats = {
//                 queueSize: this.notificationQueue.length,
//                 isRunning: this.isRunning,
//                 lastProcessed: new Date().toISOString()
//             };

//             return stats;
//         } catch (error) {
//             console.error("Error getting notification stats:", error);
//             return null;
//         }
//     }

//     isServiceRunning(): boolean {
//         return this.isRunning;
//     }
// }

// export const priceDropNotificationService = new PriceDropNotificationService();