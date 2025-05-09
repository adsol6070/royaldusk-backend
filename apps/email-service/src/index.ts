import express, { Request, Response } from "express";
import dotenv from "dotenv";
import RabbitMQService from "./consumer/rabbitmq.consumer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || "5003";

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ message: "Email Service is running!" });
});

const rabbitMQService = new RabbitMQService();

(async () => {
  try {
    await rabbitMQService.connect();
    console.log("RabbitMQ Service initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize RabbitMQ service:", error);
  }

  process.on("SIGINT", async () => {
    console.log("Shutting down gracefully...");
    await rabbitMQService.closeConnection();
    process.exit(0);
  });
})();

app.listen(PORT, () => {
  console.log(`Email Service running on port ${PORT}`);
});
