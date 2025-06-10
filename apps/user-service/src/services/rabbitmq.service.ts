import * as amqplib from "amqplib";

type AmqpConnection =
  ReturnType<typeof amqplib.connect> extends Promise<infer T> ? T : never;
type AmqpChannel =
  ReturnType<AmqpConnection["createChannel"]> extends Promise<infer T>
    ? T
    : never;

class RabbitMQ {
  private connection: AmqpConnection | null = null;
  private channel: AmqpChannel | null = null;

  private readonly queues = ["email.verify", "email.reset"];

  async connect() {
    try {
      const maxRetries = 10;
      let retries = 0;
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      while (retries < maxRetries) {
        try {
          console.log("Attempting to connect to RabbitMQ...");
          this.connection = await amqplib.connect(
            `amqp://user:password@localhost:5672`
          );

          this.channel = await this.connection.createChannel();
          console.log("RabbitMQ channel created successfully.");

          for (const queue of this.queues) {
            await this.channel.assertQueue(queue, { durable: true });
            console.log(`Queue '${queue}' is ready.`);
          }

          return;
        } catch (error) {
          retries++;
          console.error(
            `RabbitMQ connection failed. Retrying in ${retries} seconds...`
          );
          await delay(retries * 1000);
        }
      }

      throw new Error("Failed to connect to RabbitMQ after multiple retries.");
    } catch (error) {
      console.error("Error initializing RabbitMQ:", error);
      throw error;
    }
  }

  async publishToQueue(queueName: string, message: object) {
    if (!this.channel) {
      throw new Error("RabbitMQ channel is not initialized");
    }

    if (!this.queues.includes(queueName)) {
      console.warn(
        `Warning: Queue '${queueName}' is not in the list of predefined queues. You may need to assert it manually.`
      );
    }

    try {
      const buffer = Buffer.from(JSON.stringify(message));
      this.channel.sendToQueue(queueName, buffer, { persistent: true });
      console.log(`Message published to queue '${queueName}':`, message);
    } catch (error) {
      console.error("Failed to publish message:", error);
      throw error;
    }
  }

  getChannel(): AmqpChannel | null {
    return this.channel;
  }

  async closeConnection() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      console.log("RabbitMQ connection closed.");
    } catch (error) {
      console.error("Error closing RabbitMQ connection:", error);
    }
  }
}

export const rabbitMQ = new RabbitMQ();
