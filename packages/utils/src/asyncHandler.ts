import { Request, Response, NextFunction } from "express";
import { ApiError } from "./ApiError";
import { Prisma } from "@repo/database";

const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      if (err instanceof Prisma.PrismaClientValidationError) {
        const validationError = new ApiError(
          400,
          "The data provided is invalid. Please verify your inputs and try again.",
          false,
          err.stack || ""
        );
        return next(validationError);
      }

      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        let message = "An error occurred while processing your request.";

        switch (err.code) {
          case 'P2002':
            message = "A record with this unique field already exists.";
            break;
          case 'P2025':
            message = "The requested record could not be found.";
            break;
          default:
            message = "A database error occurred. Please try again later.";
        }

        const prismaError = new ApiError(
          400,
          message,
          false,
          err.stack || ""
        );
        return next(prismaError);
      }

      if (err instanceof Prisma.PrismaClientInitializationError) {
        const initError = new ApiError(
          500,
          "Failed to connect to the database. Please contact support.",
          false,
          err.stack || ""
        );
        return next(initError);
      }

      if (err instanceof Prisma.PrismaClientRustPanicError) {
        const panicError = new ApiError(
          500,
          "An unexpected error occurred while processing your request. Please try again later.",
          false,
          err.stack || ""
        );
        return next(panicError);
      }

      if (!(err instanceof ApiError)) {
        const unknownError = new ApiError(
          500,
          "An unexpected server error occurred. Please try again later.",
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
