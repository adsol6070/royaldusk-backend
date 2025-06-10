import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import config from "config";
import morgan from "morgan";
import unifiedRoutes from "./routes";
import { errorHandler } from "@repo/middlewares/errorHandler";
import { ApiError } from "@repo/utils/ApiError";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || "5004";

app.use(
  "/uploads/package-thumbnails",
  express.static(path.join(__dirname, "..", "uploads", "package-thumbnails"))
);

app.use(
  "/uploads/location-images",
  express.static(path.join(__dirname, "..", "uploads", "location-images"))
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ message: "Package Service is running!" });
});

app.all("*", (req: Request, res: Response, next: NextFunction) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
});

app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`Package Service running on port ${PORT}`);
});
