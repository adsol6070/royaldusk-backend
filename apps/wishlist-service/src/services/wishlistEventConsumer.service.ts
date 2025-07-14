// // services/wishlistEventConsumer.service.ts
// import { WishlistService } from "./wishlist.service";
// import { priceDropNotificationService } from "./priceDropNotification.service";
// import { rabbitMQ } from "./rabbitmq.service";
// import { cacheService } from "./cache.service";

// interface PackageUpdatedEvent {
//     type: 'PACKAGE_UPDATED';
//     packageId: string;
//     changes: {
//         price?: number;
//         availability?: string;
//         name?: string;
//         imageUrl?: string;
//     };
//     timestamp: Date;
// }

// interface TourUpdatedEvent {
//     type: 'TOUR_UPDATED';
//     tourId: string;
//     changes: {
//         price?: number;
//         tourAvailability?: string;
//         name?: string;
//         imageUrl?: string;
//     };
//     timestamp: Date;
// }

// interface PackageDeletedEvent {
//     type: 'PACKAGE_DELETED';
//     packageId: string;
//     timestamp: Date;
// }

// interface TourDeletedEvent {
//     type: 'TOUR_DELETED';
//     tourId: string;
//     timestamp: Date;
// }

// interface UserDeletedEvent {
//     type: 'USER_DELETED';
//     userId: string;
//     timestamp: Date;
// }

// type WishlistEvent = PackageUpdatedEvent | TourUpdatedEvent | PackageDeletedEvent | TourDeletedEvent | UserDeletedEvent;

// class WishlistEventConsumerService {
//     private isRunning = false;

//     async start(): Promise<void> {
//         if (this.isRunning) {
//             console.log("WishlistEventConsumerService is already running");
//             return;
//         }

//         try {
//             // Set up event consumers
//             await this.setupPackageEventConsumer();
//             await this.setupTourEventConsumer();
//             await this.setupUserEventConsumer();

//             this.isRunning = true;
//             console.log("WishlistEventConsumerService started successfully");
//         } catch (error) {
//             console.error("Failed to start WishlistEventConsumerService:", error);
//             throw error;
//         }
//     }

//     async stop(): Promise<void> {
//         if (!this.isRunning) {
//             return;
//         }

//         try {
//             // Close all consumers
//             await rabbitMQ.closeConsumer('package.events');
//             await rabbitMQ.closeConsumer('tour.events');
//             await rabbitMQ.closeConsumer('user.events');

//             this.isRunning = false;
//             console.log("WishlistEventConsumerService stopped successfully");
//         } catch (error) {
//             console.error("Error stopping WishlistEventConsumerService:", error);
//             throw error;
//         }
//     }

//     private async setupPackageEventConsumer(): Promise<void> {
//         await rabbitMQ.consume(
//             'package.events',
//             'wishlist.package.events',
//             async (message: any) => {
//                 try {
//                     const event: PackageUpdatedEvent | PackageDeletedEvent = JSON.parse(message.content.toString());
//                     await this.handlePackageEvent(event);
//                 } catch (error) {
//                     console.error("Error processing package event:", error);
//                     // Log error but don't throw to prevent infinite retries
//                 }
//             },
//             {
//                 durable: true,
//                 prefetch: 10
//             }
//         );
//     }

//     private async setupTourEventConsumer(): Promise<void> {
//         await rabbitMQ.consume(
//             'tour.events',
//             'wishlist.tour.events',
//             async (message: any) => {
//                 try {
//                     const event: TourUpdatedEvent | TourDeletedEvent = JSON.parse(message.content.toString());
//                     await this.handleTourEvent(event);
//                 } catch (error) {
//                     console.error("Error processing tour event:", error);
//                 }
//             },
//             {
//                 durable: true,
//                 prefetch: 10
//             }
//         );
//     }

//     private async setupUserEventConsumer(): Promise<void> {
//         await rabbitMQ.consume(
//             'user.events',
//             'wishlist.user.events',
//             async (message: any) => {
//                 try {
//                     const event: UserDeletedEvent = JSON.parse(message.content.toString());
//                     await this.handleUserEvent(event);
//                 } catch (error) {
//                     console.error("Error processing user event:", error);
//                 }
//             },
//             {
//                 durable: true,
//                 prefetch: 10
//             }
//         );
//     }

//     private async handlePackageEvent(event: PackageUpdatedEvent | PackageDeletedEvent): Promise<void> {
//         console.log(`Processing package event: ${event.type}`, event);

//         switch (event.type) {
//             case 'PACKAGE_UPDATED':
//                 await this.handlePackageUpdated(event);
//                 break;
//             case 'PACKAGE_DELETED':
//                 await this.handlePackageDeleted(event);
//                 break;
//             default:
//                 console.warn(`Unknown package event type: ${(event as any).type}`);
//         }
//     }

//     private async handleTourEvent(event: TourUpdatedEvent | TourDeletedEvent): Promise<void> {
//         console.log(`Processing tour event: ${event.type}`, event);

//         switch (event.type) {
//             case 'TOUR_UPDATED':
//                 await this.handleTourUpdated(event);
//                 break;
//             case 'TOUR_DELETED':
//                 await this.handleTourDeleted(event);
//                 break;
//             default:
//                 console.warn(`Unknown tour event type: ${(event as any).type}`);
//         }
//     }

//     private async handleUserEvent(event: UserDeletedEvent): Promise<void> {
//         console.log(`Processing user event: ${event.type}`, event);

//         switch (event.type) {
//             case 'USER_DELETED':
//                 await this.handleUserDeleted(event);
//                 break;
//             default:
//                 console.warn(`Unknown user event type: ${(event as any).type}`);
//         }
//     }

//     private async handlePackageUpdated(event: PackageUpdatedEvent): Promise<void> {
//         const { packageId, changes } = event;

//         try {
//             // Update cached package data if exists
//             await cacheService.deletePattern(`package:${packageId}:*`);

//             // Update wishlist items
//             await WishlistService.updateItemsOnPackageChange(packageId, changes);

//             // Handle price changes for notifications
//             if (changes.price) {
//                 await this.handlePriceChange('Package', packageId, changes.price);
//             }

//             // Handle availability changes
//             if (changes.availability === 'SoldOut') {
//                 await this.handleItemUnavailable('Package', packageId);
//             }

//             console.log(`Package ${packageId} updated in wishlists`);
//         } catch (error) {
//             console.error(`Error handling package update for ${packageId}:`, error);
//             throw error;
//         }
//     }

//     private async handleTourUpdated(event: TourUpdatedEvent): Promise<void> {
//         const { tourId, changes } = event;

//         try {
//             // Update cached tour data if exists
//             await cacheService.deletePattern(`tour:${tourId}:*`);

//             // Update wishlist items
//             await WishlistService.updateItemsOnTourChange(tourId, changes);

//             // Handle price changes for notifications
//             if (changes.price) {
//                 await this.handlePriceChange('Tour', tourId, Number(changes.price));
//             }

//             // Handle availability changes
//             if (changes.tourAvailability === 'SoldOut') {
//                 await this.handleItemUnavailable('Tour', tourId);
//             }

//             console.log(`Tour ${tourId} updated in wishlists`);
//         } catch (error) {
//             console.error(`Error handling tour update for ${tourId}:`, error);
//             throw error;
//         }
//     }

//     private async handlePackageDeleted(event: PackageDeletedEvent): Promise<void> {
//         const { packageId } = event;

//         try {
//             // Remove from all wishlists
//             await WishlistService.removeItemsOnPackageDelete(packageId);

//             // Clear cache
//             await cacheService.deletePattern(`package:${packageId}:*`);

//             console.log(`Package ${packageId} removed from all wishlists`);
//         } catch (error) {
//             console.error(`Error handling package deletion for ${packageId}:`, error);
//             throw error;
//         }
//     }

//     private async handleTourDeleted(event: TourDeletedEvent): Promise<void> {
//         const { tourId } = event;

//         try {
//             // Remove from all wishlists
//             await WishlistService.removeItemsOnTourDelete(tourId);

//             // Clear cache
//             await cacheService.deletePattern(`tour:${tourId}:*`);

//             console.log(`Tour ${tourId} removed from all wishlists`);
//         } catch (error) {
//             console.error(`Error handling tour deletion for ${tourId}:`, error);
//             throw error;
//         }
//     }

//     private async handleUserDeleted(event: UserDeletedEvent): Promise<void> {
//         const { userId } = event;

//         try {
//             // Remove user's entire wishlist
//             await WishlistService.removeItemsOnUserDelete(userId);

//             // Clear user's cache
//             await cacheService.deletePattern(`user:${userId}:*`);

//             console.log(`User ${userId} wishlist data removed`);
//         } catch (error) {
//             console.error(`Error handling user deletion for ${userId}:`, error);
//             throw error;
//         }
//     }

//     private async handlePriceChange(itemType: 'Package' | 'Tour', itemId: string, newPrice: number): Promise<void> {
//         try {
//             // Find users who have this item in their wishlist
//             const wishlistItems = await WishlistService.findManyWishlistItems(
//                 {
//                     ...(itemType === 'Package' ? { packageId: itemId } : { tourId: itemId })
//                 },
//                 {
//                     id: true,
//                     userId: true,
//                     priceWhenAdded: true,
//                     isNotified: true
//                 }
//             );

//             // Queue price drop notifications
//             for (const item of wishlistItems) {
//                 if (item.priceWhenAdded && newPrice < Number(item.priceWhenAdded) && !item.isNotified) {
//                     await priceDropNotificationService.queuePriceDropNotification({
//                         userId: item.userId,
//                         itemId: item.id,
//                         itemType,
//                         oldPrice: Number(item.priceWhenAdded),
//                         newPrice,
//                         savingsAmount: Number(item.priceWhenAdded) - newPrice
//                     });
//                 }
//             }
//         } catch (error) {
//             console.error(`Error handling price change for ${itemType} ${itemId}:`, error);
//         }
//     }

//     private async handleItemUnavailable(itemType: 'Package' | 'Tour', itemId: string): Promise<void> {
//         try {
//             // Option 1: Remove unavailable items from wishlists
//             if (itemType === 'Package') {
//                 await WishlistService.removeItemsOnPackageDelete(itemId);
//             } else {
//                 await WishlistService.removeItemsOnTourDelete(itemId);
//             }

//             console.log(`${itemType} ${itemId} removed from wishlists due to unavailability`);
//         } catch (error) {
//             console.error(`Error handling unavailable ${itemType} ${itemId}:`, error);
//         }
//     }

//     isServiceRunning(): boolean {
//         return this.isRunning;
//     }
// }

// export const wishlistEventConsumerService = new WishlistEventConsumerService();