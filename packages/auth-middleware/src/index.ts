import { NextFunction, Request, Response } from "express";
import { verifyJwt } from "@repo/utils/jwt";
import { ApiError } from "@repo/utils/ApiError";

export const deserializeUser =
  (excludedFields: string[] = []) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let token = req.headers.authorization?.startsWith("Bearer")
        ? req.headers.authorization.split(" ")[1]
        : req.cookies.access_token;

      if (!token) {
        return next(new ApiError(401, "You are not logged in"));
      }

      const decoded = verifyJwt<{ sub: string }>(token, "accessTokenPublicKey");

      if (!decoded) {
        return next(new ApiError(401, "Invalid token"));
      }

      //   Attach raw decoded JWT (without excluded fields)
      for (const field of excludedFields) {
        delete (decoded as any)[field];
      }

      res.locals.user = decoded;
      next();
    } catch (err) {
      next(err);
    }
  };

export const requireUser = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user;

    if (!user) {
      return next(
        new ApiError(400, `Session has expired or user doesn't exist`)
      );
    }

    next();
  } catch (err: any) {
    next(err);
  }
};
