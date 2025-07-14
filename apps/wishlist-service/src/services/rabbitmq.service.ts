// // services/rabbitmq.service.ts
// import amqp, { Connection, Channel, ConsumeMessage } from 'amqplib';

// interface ConsumerOptions {
//     durable?: boolean;
//     prefetch?: number;
//     autoAck?: boolean;
// }

// class RabbitMQService {
//     private connection: Connection | null = null;
//     private channel: Channel | null = null;
//     private consumers: Map<string, any> = new Map();
//     private isConnected = false;

//     async connect(): Promise<void> {
//         try {
//             if (this.isConnected && this.connection) {
//                 console.log("RabbitMQ already connected");
//                 return;
//             }

//             const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

//             this.connection = await amqp.connect(rabbitUrl);
//             this.channel = await this.connection.createChannel();

//             this.connection.on('error', (error) => {
//                 console.error("RabbitMQ connection error:", error);
//                 this.isConnected = false;
//             });

//             this.connection.on('close', () => {
//                 console.log("RabbitMQ connection closed");
//                 this.isConnected = false;
//             });

//             this.isConnected = true;
//             console.log("RabbitMQ connected successfully");

//             // Set up exchanges and queues for wishlist service
//             await this.setupInfrastructure();
//         } catch (error) {
//             console.error("Failed to connect to RabbitMQ:", error);
//             throw error;
//         }
//     }

//     async closeConnection(): Promise<void> {
//         try {
//             // Close all consumers
//             for (const [queueName, consumer] of this.consumers) {
//                 await this.closeConsumer(queueName);
//             }

//             if (this.channel) {
//                 await this.channel.close();
//                 this.channel = null;
//             }

//             if (this.connection) {
//                 await this.connection.close();
//                 this.connection = null;
//             }

//             this.isConnected = false;
//             console.log("RabbitMQ disconnected successfully");
//         } catch (error) {
//             console.error("Error closing RabbitMQ connection:", error);
//             throw error;
//         }
//     }

//     private async setupInfrastructure(): Promise<void> {
//         if (!this.channel) {
//             throw new Error("RabbitMQ channel not available");
//         }

//         try {
//             // Declare exchanges
//             await this.channel.assertExchange('package.events', 'topic', { durable: true });
//             await this.channel.assertExchange('tour.events', 'topic', { durable: true });
//             await this.channel.assertExchange('user.events', 'topic', { durable: true });
//             await this.channel.assertExchange('user.notifications', 'topic', { durable: true });
//             await this.channel.assertExchange('price.drop.notifications', 'topic', { durable: true });

//             // Declare queues for wishlist service
//             await this.channel.assertQueue('wishlist.package.events', { durable: true });
//             await this.channel.assertQueue('wishlist.tour.events', { durable: true });
//             await this.channel.assertQueue('wishlist.user.events', { durable: true });
//             await this.channel.assertQueue('wishlist.price.drop.queue', { durable: true });

//             // Bind queues to exchanges
//             await this.channel.bindQueue('wishlist.package.events', 'package.events', 'package.*');
//             await this.channel.bindQueue('wishlist.tour.events', 'tour.events', 'tour.*');
//             await this.channel.bindQueue('wishlist.user.events', 'user.events', 'user.deleted');
//             await this.channel.bindQueue('wishlist.price.drop.queue', 'price.drop.notifications', 'price.drop.*');

//             console.log("RabbitMQ infrastructure set up successfully");
//         } catch (error) {
//             console.error("Error setting up RabbitMQ infrastructure:", error);
//             throw error;
//         }
//     }

//     async publish(exchange: string, message: any, routingKey: string = ''): Promise<void> {
//         try {
//             if (!this.channel || !this.isConnected) {
//                 throw new Error("RabbitMQ not connected");
//             }

//             const messageBuffer = Buffer.from(JSON.stringify(message));

//             await this.channel.publish(exchange, routingKey, messageBuffer, {
//                 persistent: true,
//                 timestamp: Date.now(),
//                 messageId: this.generateMessageId()
//             });

//             console.log(`Message published to exchange ${exchange} with routing key ${routingKey}`);
//         } catch (error) {
//             console.error(`Error publishing message to ${exchange}:`, error);
//             throw error;
//         }
//     }

//     async consume(
//         exchange: string,
//         queueName: string,
//         handler: (message: ConsumeMessage) => Promise<void>,
//         options: ConsumerOptions = {}
//     ): Promise<void> {
//         try {
//             if (!this.channel || !this.isConnected) {
//                 throw new Error("RabbitMQ not connected");
//             }

//             const {
//                 durable = true,
//                 prefetch = 10,
//                 autoAck = false
//             } = options;

//             // Set prefetch count
//             await this.channel.prefetch(prefetch);

//             // Ensure queue exists
//             await this.channel.assertQueue(queueName, { durable });

//             // Start consuming
//             const consumer = await this.channel.consume(queueName, async (message) => {
//                 if (!message) return;

//                 try {
//                     await handler(message);

//                     if (!autoAck && this.channel) {
//                         this.channel.ack(message);
//                     }
//                 } catch (error) {
//                     console.error(`Error processing message from ${queueName}:`, error);

//                     if (!autoAck && this.channel) {
//                         // Reject and requeue the message
//                         this.channel.nack(message, false, true);
//                     }
//                 }
//             }, { noAck: autoAck });

//             if (consumer) {
//                 this.consumers.set(queueName, consumer);
//                 console.log(`Consumer started for queue ${queueName}`);
//             }
//         } catch (error) {
//             console.error(`Error setting up consumer for ${queueName}:`, error);
//             throw error;
//         }
//     }

//     async closeConsumer(queueName: string): Promise<void> {
//         try {
//             const consumer = this.consumers.get(queueName);

//             if (consumer && this.channel) {
//                 await this.channel.cancel(consumer.consumerTag);
//                 this.consumers.delete(queueName);
//                 console.log(`Consumer closed for queue ${queueName}`);
//             }
//         } catch (error) {
//             console.error(`Error closing consumer for ${queueName}:`, error);
//         }
//     }

//     // Wishlist-specific publishing methods
//     async publishWishlistEvent(eventType: string, data: any): Promise<void> {
//         await this.publish('wishlist.events', {
//             type: eventType,
//             data,
//             timestamp: new Date(),
//             service: 'wishlist-service'
//         }, `wishlist.${eventType}`);
//     }

//     async publishPriceDropNotification(notification: any): Promise<void> {
//         await this.publish('price.drop.notifications', notification, 'price.drop.alert');
//     }

//     async publishUserNotification(notification: any): Promise<void> {
//         await this.publish('user.notifications', notification, `notification.${notification.type}`);
//     }

//     // Health check methods
//     isConnectedStatus(): boolean {
//         return this.isConnected && !!this.connection && !!this.channel;
//     }

//     async getConnectionStatus(): Promise<{
//         connected: boolean;
//         consumers: string[];
//         queues: number;
//     }> {
//         return {
//             connected: this.isConnected,
//             consumers: Array.from(this.consumers.keys()),
//             queues: this.consumers.size
//         };
//     }

//     async getQueueInfo(queueName: string): Promise<any> {
//         try {
//             if (!this.channel || !this.isConnected) {
//                 return null;
//             }

//             const queueInfo = await this.channel.checkQueue(queueName);
//             return queueInfo;
//         } catch (error) {
//             console.error(`Error getting queue info for ${queueName}:`, error);
//             return null;
//         }
//     }

//     // Utility methods
//     private generateMessageId(): string {
//         return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
//     }

//     async purgeQueue(queueName: string): Promise<void> {
//         try {
//             if (!this.channel || !this.isConnected) {
//                 throw new Error("RabbitMQ not connected");
//             }

//             await this.channel.purgeQueue(queueName);
//             console.log(`Queue ${queueName} purged`);
//         } catch (error) {
//             console.error(`Error purging queue ${queueName}:`, error);
//             throw error;
//         }
//     }

//     async deleteQueue(queueName: string): Promise<void> {
//         try {
//             if (!this.channel || !this.isConnected) {
//                 throw new Error("RabbitMQ not connected");
//             }

//             await this.channel.deleteQueue(queueName);
//             console.log(`Queue ${queueName} deleted`);
//         } catch (error) {
//             console.error(`Error deleting queue ${queueName}:`, error);
//             throw error;
//         }
//     }

//     // Retry mechanism for failed connections
//     async connectWithRetry(maxRetries: number = 5, delay: number = 5000): Promise<void> {
//         for (let attempt = 1; attempt <= maxRetries; attempt++) {
//             try {
//                 await this.connect();
//                 return;
//             } catch (error) {
//                 console.error(`Connection attempt ${attempt} failed:`, error);

//                 if (attempt === maxRetries) {
//                     throw new Error(`Failed to connect to RabbitMQ after ${maxRetries} attempts`);
//                 }

//                 console.log(`Retrying in ${delay}ms...`);
//                 await new Promise(resolve => setTimeout(resolve, delay));
//             }
//         }
//     }
// }

// export const rabbitMQ = new RabbitMQService();