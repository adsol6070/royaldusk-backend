import { Request, Response, NextFunction } from "express";
import { ApiError } from "./ApiError";
import { Prisma } from "@repo/database";

const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      if (err instanceof Prisma.PrismaClientValidationError) {
        const validationError = new ApiError(
          400,
          `Validation error in Prisma query: ${err.message}`,
          false,
          err.stack || ""
        );
        return next(validationError);
      }

      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        const prismaError = new ApiError(
          400,
          `Prisma error: ${err.message}`,
          false,
          err.stack || ""
        );
        return next(prismaError);
      }

      if (!(err instanceof ApiError)) {
        const unknownError = new ApiError(
          500,
          err.message || "Internal Server Error",
          false,
          err.stack || ""
        );
        return next(unknownError);
      }
      return next(err);
    });
  };
};

export { asyncHandler };
