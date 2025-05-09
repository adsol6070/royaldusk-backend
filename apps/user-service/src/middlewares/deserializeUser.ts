import { NextFunction, Request, Response } from "express";
import { omit } from "lodash";
import redisClient from "../utils/connectRedis";
import { ApiError } from "@repo/utils/ApiError";
import { excludedFields, UserService } from "../services/user.service";
import { verifyJwt } from "@repo/utils/jwt";

export const deserializeUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let access_token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      access_token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.access_token) {
      access_token = req.cookies.access_token;
    }

    if (!access_token) {
      return next(new ApiError(401, "You are not logged in"));
    }

    const decoded = verifyJwt<{ sub: string }>(
      access_token,
      "accessTokenPublicKey"
    );

    if (!decoded) {
      return next(new ApiError(401, `Invalid token or user doesn't exist`));
    }

    // const session = await redisClient.get(decoded.sub);

    // if (!session) {
    //   return next(new ApiError(401, `Invalid token or session has expired`));
    // }

    // const user = await UserService.findUniqueUser({
    //   id: JSON.parse(session).id,
    // });

    // if (!user) {
    //   return next(new ApiError(401, `Invalid token or session has expired`));
    // }

    res.locals.user = omit(decoded, excludedFields);

    next();
  } catch (err: any) {
    next(err);
  }
};
