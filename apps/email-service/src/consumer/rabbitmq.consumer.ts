import * as amqplib from "amqplib";
import { config } from "../config/config";
import { sendEmail } from "../services/email.service";

type AmqpConnection =
  ReturnType<typeof amqplib.connect> extends Promise<infer T> ? T : never;
type AmqpChannel =
  ReturnType<AmqpConnection["createChannel"]> extends Promise<infer T>
    ? T
    : never;

class RabbitMQService {
  connection: AmqpConnection | null;
  channel: AmqpChannel | null;
  retries: number;
  MAX_RETRIES: number;
  RETRY_DELAY: number;
  constructor() {
    this.connection = null;
    this.channel = null;
    this.retries = 0;
    this.MAX_RETRIES = 5;
    this.RETRY_DELAY = 3000;
  }

  async connect() {
    while (this.retries < this.MAX_RETRIES) {
      try {
        this.connection = await amqplib.connect(config.rabbitmq.url);
        this.channel = await this.connection.createChannel();
        await this.channel.assertQueue(config.rabbitmq.queue, {
          durable: true,
        });

        console.log(`Waiting for messages in ${config.rabbitmq.queue}`);
        this.consumeMessages();

        return;
      } catch (error) {
        this.retries++;
        console.error(
          `Error connecting to RabbitMQ (Attempt ${this.retries} of ${this.MAX_RETRIES}):`,
          error
        );

        if (this.retries >= this.MAX_RETRIES) {
          console.error("Maximum retry attempts reached. Exiting...");
          throw new Error(
            "Failed to connect to RabbitMQ after multiple attempts."
          );
        }

        console.log(`Retrying in ${this.RETRY_DELAY / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY));
      }
    }
  }

  async consumeMessages() {
    try {
      this.channel?.consume(config.rabbitmq.queue, async (msg) => {
        if (msg) {
          const emailData = JSON.parse(msg.content.toString());
          const {
            to,
            subject,
            text,
            html,
            templateName,
            templateData,
            attachments,
          } = emailData;

          try {
            await sendEmail(
              to,
              subject,
              text,
              html,
              templateName,
              templateData,
              attachments
            );
            this.channel?.ack(msg);
          } catch (error) {
            console.error("Error processing email message:", error);
            this.channel?.nack(msg, false, true);
          }
        }
      });
    } catch (error) {
      console.error("Error consuming messages:", error);
    }
  }

  async closeConnection() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
      console.log("RabbitMQ connection closed.");
    } catch (error) {
      console.error("Error closing RabbitMQ connection:", error);
    }
  }
}

export default RabbitMQService;
