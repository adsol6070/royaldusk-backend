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

  queues = ["email.verify", "email.reset", "email.otp", "email.failed"];

  constructor() {
    this.connection = null;
    this.channel = null;
    this.retries = 0;
    this.MAX_RETRIES = 10;
    this.RETRY_DELAY = 3000;
  }

  async connect() {
    while (this.retries < this.MAX_RETRIES) {
      try {
        this.connection = await amqplib.connect(config.rabbitmq.url);
        this.channel = await this.connection.createChannel();

        for (const queue of this.queues) {
          await this.channel.assertQueue(queue, { durable: true });
          console.log(`Waiting for messages in queue: ${queue}`);

          if (queue !== "email.failed") {
            this.consumeMessages(queue);
          }
        }

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

  async consumeMessages(queueName: string) {
    try {
      this.channel?.consume(queueName, async (msg) => {
        if (!msg) return;

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

        const MAX_ATTEMPTS = 3;
        const attempts =
          msg.properties.headers?.["x-attempt"] !== undefined
            ? msg.properties.headers["x-attempt"]
            : 0;

        try {
          await sendEmail({
            to,
            subject,
            text,
            html,
            templateName,
            templateData,
            attachments,
          });

          this.channel?.ack(msg);
        } catch (error) {
          console.error(`Email sending failed for ${to}:`, error);

          if (attempts + 1 >= MAX_ATTEMPTS) {
            // Send to failed queue after max attempts
            const failedPayload = {
              to,
              templateName,
              templateData,
              reason: error instanceof Error ? error.message : "Unknown error",
            };

            console.log(
              `Max attempts reached. Sending email to 'email.failed' queue.`
            );
            this.channel?.ack(msg); // Acknowledge original message
            this.channel?.sendToQueue(
              "email.failed",
              Buffer.from(JSON.stringify(failedPayload)),
              {
                persistent: true,
              }
            );
          } else {
            // Retry: nack original and publish new message with incremented attempts
            this.channel?.ack(msg); // Ack original so it doesn't requeue automatically

            // Publish new message with incremented attempt count
            this.channel?.sendToQueue(
              queueName,
              Buffer.from(msg.content.toString()),
              {
                persistent: true,
                headers: { "x-attempt": attempts + 1 },
              }
            );

            console.log(`Retrying email for ${to}, attempt ${attempts + 1}`);
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
