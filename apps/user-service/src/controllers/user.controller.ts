import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "@repo/utils/asyncHandler";

const getMeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = res.locals.user;

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
};

export default {
  getMeHandler: asyncHandler(getMeHandler),
};
