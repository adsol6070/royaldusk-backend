require("dotenv").config();
import express, { NextFunction, Request, Response } from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "config";
import unifiedRoutes from "./routes";
// import { rabbitMQ } from "./services/rabbitmq.service";
import { ApiError } from "@repo/utils/ApiError";
import { errorHandler } from "@repo/middlewares/errorHandler";
// import { wishlistEventConsumerService } from "./services/wishlistEventConsumer.service";
// import { priceDropNotificationService } from "./services/priceDropNotification.service";
// import { cacheService } from "./services/cache.service";

const app = express();
const PORT = process.env.PORT || "5008";

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
    res.status(200).json({
        message: "Wishlist Service is running!",
        service: "wishlist-service",
        version: "1.0.0",
        status: "healthy",
        timestamp: new Date().toISOString()
    });
});

// Wishlist-specific health check with dependencies
app.get("/health/detailed", async (req: Request, res: Response) => {
    try {
        const health = {
            service: "wishlist-service",
            status: "healthy",
            timestamp: new Date().toISOString(),
            dependencies: {
                database: "unknown",
                cache: "unknown",
                messageQueue: "unknown"
            }
        };

        // Check database connection
        try {
            const { prisma } = await import("@repo/database");
            await prisma.$queryRaw`SELECT 1`;
            health.dependencies.database = "healthy";
        } catch (error) {
            health.dependencies.database = "unhealthy";
            health.status = "degraded";
        }

        // Check cache connection
        // try {
        //     await cacheService.ping();
        //     health.dependencies.cache = "healthy";
        // } catch (error) {
        //     health.dependencies.cache = "unhealthy";
        //     health.status = "degraded";
        // }

        // Check message queue connection
        // try {
        //     if (rabbitMQ.isConnectedStatus()) {
        //         health.dependencies.messageQueue = "healthy";
        //     } else {
        //         health.dependencies.messageQueue = "unhealthy";
        //         health.status = "degraded";
        //     }
        // } catch (error) {
        //     health.dependencies.messageQueue = "unhealthy";
        //     health.status = "degraded";
        // }

        const statusCode = health.status === "healthy" ? 200 : 503;
        res.status(statusCode).json(health);
    } catch (error) {
        res.status(503).json({
            service: "wishlist-service",
            status: "unhealthy",
            timestamp: new Date().toISOString(),
            error: "Health check failed"
        });
    }
});

// Readiness probe for Kubernetes
app.get("/ready", async (req: Request, res: Response) => {
    try {
        const { prisma } = await import("@repo/database");
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({
            status: "ready",
            service: "wishlist-service"
        });
    } catch (error) {
        res.status(503).json({
            status: "not ready",
            service: "wishlist-service"
        });
    }
});

// Liveness probe for Kubernetes
app.get("/live", (req: Request, res: Response) => {
    res.status(200).json({
        status: "alive",
        service: "wishlist-service",
        uptime: process.uptime()
    });
});

app.all("*", (req: Request, res: Response, next: NextFunction) => {
    next(new ApiError(404, `Route ${req.originalUrl} not found`));
});

app.use(errorHandler);

app.listen(PORT, async () => {
    console.log(`Wishlist Service running on port ${PORT}`);
    // try {
    // Initialize cache service
    // await cacheService.connect();
    // console.log("Cache service connected successfully");

    // Connect to RabbitMQ
    // await rabbitMQ.connect();
    // console.log("RabbitMQ connected successfully");

    // Start event consumer services
    // await wishlistEventConsumerService.start();
    // console.log("WishlistEventConsumerService started");

    // Start price drop notification service
    // await priceDropNotificationService.start();
    // console.log("PriceDropNotificationService started");

    // console.log("Wishlist Service fully initialized and ready to serve requests");
    // } catch (err) {
    //     console.error("Error during service startup:", err);
    //     process.exit(1);
    // }
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
    console.log(`${signal} received. Shutting down Wishlist Service gracefully...`);

    try {
        // Stop consuming new messages
        // await wishlistEventConsumerService.stop();
        // console.log("WishlistEventConsumerService stopped");

        // Stop price drop notification service
        // await priceDropNotificationService.stop();
        // console.log("PriceDropNotificationService stopped");

        // Close RabbitMQ connection
        // await rabbitMQ.closeConnection();
        // console.log("RabbitMQ connection closed");

        // Close cache connection
        // await cacheService.disconnect();
        // console.log("Cache service disconnected");

        console.log("Wishlist Service shutdown completed");
        process.exit(0);
    } catch (error) {
        console.error("Error during graceful shutdown:", error);
        process.exit(1);
    }
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    gracefulShutdown("UNCAUGHT_EXCEPTION");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    gracefulShutdown("UNHANDLED_REJECTION");
});