// // services/cache.service.ts
// import Redis from 'ioredis';

// class CacheService {
//     private redis: Redis | null = null;
//     private isConnected = false;

//     async connect(): Promise<void> {
//         try {
//             if (this.isConnected && this.redis) {
//                 console.log("Cache service already connected");
//                 return;
//             }

//             const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

//             this.redis = new Redis(redisUrl, {
//                 retryDelayOnFailover: 100,
//                 maxRetriesPerRequest: 3,
//                 lazyConnect: true,
//                 keepAlive: 30000,
//                 connectTimeout: 10000,
//                 commandTimeout: 5000,
//             });

//             this.redis.on('connect', () => {
//                 this.isConnected = true;
//                 console.log("Redis connected successfully");
//             });

//             this.redis.on('error', (error) => {
//                 this.isConnected = false;
//                 console.error("Redis connection error:", error);
//             });

//             this.redis.on('close', () => {
//                 this.isConnected = false;
//                 console.log("Redis connection closed");
//             });

//             await this.redis.connect();
//         } catch (error) {
//             console.error("Failed to connect to Redis:", error);
//             throw error;
//         }
//     }

//     async disconnect(): Promise<void> {
//         try {
//             if (this.redis) {
//                 await this.redis.quit();
//                 this.redis = null;
//                 this.isConnected = false;
//                 console.log("Redis disconnected successfully");
//             }
//         } catch (error) {
//             console.error("Error disconnecting from Redis:", error);
//             throw error;
//         }
//     }

//     async get<T>(key: string): Promise<T | null> {
//         try {
//             if (!this.redis || !this.isConnected) {
//                 console.warn("Redis not connected, skipping cache get");
//                 return null;
//             }

//             const value = await this.redis.get(key);
//             return value ? JSON.parse(value) : null;
//         } catch (error) {
//             console.error(`Cache get error for key ${key}:`, error);
//             return null;
//         }
//     }

//     async set(key: string, value: any, ttl?: number): Promise<void> {
//         try {
//             if (!this.redis || !this.isConnected) {
//                 console.warn("Redis not connected, skipping cache set");
//                 return;
//             }

//             const serialized = JSON.stringify(value);

//             if (ttl) {
//                 await this.redis.setex(key, ttl, serialized);
//             } else {
//                 await this.redis.set(key, serialized);
//             }
//         } catch (error) {
//             console.error(`Cache set error for key ${key}:`, error);
//         }
//     }

//     async setWithTTL(key: string, value: any, ttlSeconds: number): Promise<void> {
//         await this.set(key, value, ttlSeconds);
//     }

//     async del(key: string): Promise<void> {
//         try {
//             if (!this.redis || !this.isConnected) {
//                 console.warn("Redis not connected, skipping cache delete");
//                 return;
//             }

//             await this.redis.del(key);
//         } catch (error) {
//             console.error(`Cache delete error for key ${key}:`, error);
//         }
//     }

//     async deletePattern(pattern: string): Promise<void> {
//         try {
//             if (!this.redis || !this.isConnected) {
//                 console.warn("Redis not connected, skipping pattern delete");
//                 return;
//             }

//             const keys = await this.redis.keys(pattern);
//             if (keys.length > 0) {
//                 await this.redis.del(...keys);
//             }
//         } catch (error) {
//             console.error(`Cache pattern delete error for pattern ${pattern}:`, error);
//         }
//     }

//     async exists(key: string): Promise<boolean> {
//         try {
//             if (!this.redis || !this.isConnected) {
//                 return false;
//             }

//             const result = await this.redis.exists(key);
//             return result === 1;
//         } catch (error) {
//             console.error(`Cache exists error for key ${key}:`, error);
//             return false;
//         }
//     }

//     async ping(): Promise<boolean> {
//         try {
//             if (!this.redis || !this.isConnected) {
//                 return false;
//             }

//             const result = await this.redis.ping();
//             return result === 'PONG';
//         } catch (error) {
//             console.error("Cache ping error:", error);
//             return false;
//         }
//     }

//     // Wishlist-specific cache methods
//     async cacheWishlistCount(userId: string, count: any): Promise<void> {
//         const key = `wishlist:count:${userId}`;
//         await this.setWithTTL(key, count, 300); // 5 minutes
//     }

//     async getCachedWishlistCount(userId: string): Promise<any> {
//         const key = `wishlist:count:${userId}`;
//         return this.get(key);
//     }

//     async cacheWishlistItems(userId: string, items: any[], options: any = {}): Promise<void> {
//         const key = `wishlist:items:${userId}:${JSON.stringify(options)}`;
//         await this.setWithTTL(key, items, 600); // 10 minutes
//     }

//     async getCachedWishlistItems(userId: string, options: any = {}): Promise<any[]> {
//         const key = `wishlist:items:${userId}:${JSON.stringify(options)}`;
//         return this.get(key);
//     }

//     async invalidateUserCache(userId: string): Promise<void> {
//         await this.deletePattern(`wishlist:*:${userId}*`);
//         await this.deletePattern(`user:${userId}:*`);
//     }

//     async cacheItemData(itemId: string, itemType: string, data: any): Promise<void> {
//         const key = `item:${itemType}:${itemId}`;
//         await this.setWithTTL(key, data, 1800); // 30 minutes
//     }

//     async getCachedItemData(itemId: string, itemType: string): Promise<any> {
//         const key = `item:${itemType}:${itemId}`;
//         return this.get(key);
//     }

//     async cacheUserPreferences(userId: string, preferences: any): Promise<void> {
//         const key = `user_preferences:${userId}`;
//         await this.setWithTTL(key, preferences, 3600); // 1 hour
//     }

//     async getCachedUserPreferences(userId: string): Promise<any> {
//         const key = `user_preferences:${userId}`;
//         return this.get(key);
//     }

//     // Batch operations
//     async mget(keys: string[]): Promise<(any | null)[]> {
//         try {
//             if (!this.redis || !this.isConnected || keys.length === 0) {
//                 return keys.map(() => null);
//             }

//             const values = await this.redis.mget(...keys);
//             return values.map(value => value ? JSON.parse(value) : null);
//         } catch (error) {
//             console.error("Cache mget error:", error);
//             return keys.map(() => null);
//         }
//     }

//     async mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<void> {
//         try {
//             if (!this.redis || !this.isConnected) {
//                 console.warn("Redis not connected, skipping cache mset");
//                 return;
//             }

//             const pipeline = this.redis.pipeline();

//             for (const [key, value] of Object.entries(keyValuePairs)) {
//                 const serialized = JSON.stringify(value);
//                 if (ttl) {
//                     pipeline.setex(key, ttl, serialized);
//                 } else {
//                     pipeline.set(key, serialized);
//                 }
//             }

//             await pipeline.exec();
//         } catch (error) {
//             console.error("Cache mset error:", error);
//         }
//     }

//     // Analytics and monitoring
//     async getConnectionStatus(): Promise<{
//         connected: boolean;
//         status: string;
//         host?: string;
//         port?: number;
//     }> {
//         return {
//             connected: this.isConnected,
//             status: this.isConnected ? 'connected' : 'disconnected',
//             host: this.redis?.options.host,
//             port: this.redis?.options.port,
//         };
//     }

//     async getCacheStats(): Promise<any> {
//         try {
//             if (!this.redis || !this.isConnected) {
//                 return null;
//             }

//             const info = await this.redis.info('memory');
//             const keyspace = await this.redis.info('keyspace');

//             return {
//                 memory: info,
//                 keyspace: keyspace,
//                 connected: this.isConnected
//             };
//         } catch (error) {
//             console.error("Error getting cache stats:", error);
//             return null;
//         }
//     }

//     // Lock mechanism for critical operations
//     async acquireLock(key: string, ttl: number = 30): Promise<boolean> {
//         try {
//             if (!this.redis || !this.isConnected) {
//                 return false;
//             }

//             const lockKey = `lock:${key}`;
//             const result = await this.redis.set(lockKey, '1', 'EX', ttl, 'NX');
//             return result === 'OK';
//         } catch (error) {
//             console.error(`Error acquiring lock for ${key}:`, error);
//             return false;
//         }
//     }

//     async releaseLock(key: string): Promise<void> {
//         try {
//             if (!this.redis || !this.isConnected) {
//                 return;
//             }

//             const lockKey = `lock:${key}`;
//             await this.redis.del(lockKey);
//         } catch (error) {
//             console.error(`Error releasing lock for ${key}:`, error);
//         }
//     }

//     isServiceConnected(): boolean {
//         return this.isConnected;
//     }
// }

// export const cacheService = new CacheService();