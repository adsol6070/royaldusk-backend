import dotenv from "dotenv";
dotenv.config();
import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import config from "config";
import unifiedRoutes from "./routes";
import { errorHandler } from "@repo/middlewares/errorHandler"
import { ApiError } from "@repo/utils/ApiError";
import path from "path";

const app = express();
const PORT = process.env.PORT || "5007";

app.use(
  "/uploads/tour-thumbnails",
  express.static(path.join(__dirname, "..", "uploads", "tour-thumbnails"))
);

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

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ message: "Tour Service is running!" });
});

app.all("*", (req: Request, res: Response, next: NextFunction) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
});

app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`Tour Service running on port ${PORT}`);
});
