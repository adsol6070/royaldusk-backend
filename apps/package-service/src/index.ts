import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import config from "config";
import morgan from "morgan";
import unifiedRoutes from "./routes";
import { errorHandler } from "@repo/middlewares/errorHandler"
import { ApiError } from "@repo/utils/ApiError";

dotenv.config();

const app = express();
const PORT = process.env.PORT || "5004";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: config.get<string>("origin"),
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
