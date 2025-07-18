require("dotenv").config();
import express, { NextFunction, Request, Response } from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "config";
import unifiedRoutes from "./routes";
import { rabbitMQ } from "./services/rabbitmq.service";
import { ApiError } from "@repo/utils/ApiError";
import { errorHandler } from "@repo/middlewares/errorHandler";
import { emailFailedConsumerService } from "./services/emailFailedConsumer.service";

const app = express();
const PORT = process.env.PORT || "5001";

const message = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

app.use("/api", unifiedRoutes);

app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ message: "User Service is running!" });
});

app.all("*", (req: Request, res: Response, next: NextFunction) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
});

app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`User Service runningg on port ${PORT}`);
  try {
    await rabbitMQ.connect();

    await emailFailedConsumerService.start();

    console.log("EmailFailedConsumerService started.");
  } catch (err) {
    console.error("Error during service startup:", err);
    process.exit(1);
  }
});

process.on("SIGINT", async () => {
  console.log("Shutting down User Service...");
  await rabbitMQ.closeConnection();
  process.exit(0);
});
