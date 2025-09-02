import { rabbitMQ } from "./rabbitmq.service";
import { UserService } from "./user.service";

class EmailFailedConsumerService {
  private consumerTag: string | null = null;

  async start() {
    const queueName = "email.failed";
    const channel = rabbitMQ.getChannel();

    if (!channel) {
      throw new Error("RabbitMQ channel not initialized.");
    }

    await channel?.assertQueue(queueName, { durable: true });

    console.log(`[*] Waiting for messages in ${queueName}`);

    channel?.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const failedEmailData = JSON.parse(msg.content.toString());
          console.log("Received failed email message:", failedEmailData);

          // await UserService.rollbackUserAction(failedEmailData);

          channel?.ack(msg);
        } catch (error) {
          console.error("Error processing failed email message:", error);
          channel?.nack(msg, false, true);
        }
      }
    });
  }

  async stop() {
    const channel = rabbitMQ.getChannel();
    if (channel && this.consumerTag) {
      await channel.cancel(this.consumerTag);
      console.log("[x] Email consumer stopped.");
    }
  }
}

export const emailFailedConsumerService = new EmailFailedConsumerService();
