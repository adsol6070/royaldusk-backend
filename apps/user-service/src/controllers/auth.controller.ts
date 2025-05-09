import { CookieOptions, Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import config from "config";

import { UserService } from "../services/user.service";
import { rabbitMQ } from "../services/rabbitmq.service";
import { asyncHandler } from "@repo/utils/asyncHandler";
import { ApiError } from "@repo/utils/ApiError";

const cookiesOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
};

if (process.env.NODE_ENV === "production") cookiesOptions.secure = true;

const accessTokenCookieOptions: CookieOptions = {
  ...cookiesOptions,
  expires: new Date(
    Date.now() + config.get<number>("accessTokenExpiresIn") * 60 * 1000
  ),
  maxAge: config.get<number>("accessTokenExpiresIn") * 60 * 1000,
};

const refreshTokenCookieOptions: CookieOptions = {
  ...cookiesOptions,
  expires: new Date(
    Date.now() + config.get<number>("refreshTokenExpiresIn") * 60 * 1000
  ),
  maxAge: config.get<number>("refreshTokenExpiresIn") * 60 * 1000,
};

const register = async (req: Request, res: Response): Promise<any> => {
  const { name, email } = req.body;

  const hashedPassword = await bcrypt.hash(req.body.password, 12);

  const verifyCode = crypto.randomBytes(32).toString("hex");
  const verificationCode = crypto
    .createHash("sha256")
    .update(verifyCode)
    .digest("hex");

  const user = await UserService.createUser({
    name: req.body.name,
    email: req.body.email.toLowerCase(),
    password: hashedPassword,
    verificationCode,
  });

  // const queue = process.env.EMAIL_QUEUE || "emailQueue";
  // await rabbitMQ.publishToQueue(queue, {
  //   to: email,
  //   subject: "Welcome!",
  //   text: `Hi ${name}, welcome to our platform!`,
  // });

  res.status(201).json({
    success: true,
    message: "An email with a verification code has been sent to your email",
  });
};

const login = async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;

  const user = await UserService.findUniqueUser(
    { email: email.toLowerCase() },
    { id: true, email: true, verified: true, password: true }
  );

  if (!user) {
    throw new ApiError(400, "Invalid credentials.");
  }

  // if (!user.verified) {
  //   throw new ApiError(401, "Please verify your email address.");
  // }

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError(400, "Invalid email or password");
  }

  const { access_token, refresh_token } = await UserService.signTokens(user);
  res.cookie("access_token", access_token, accessTokenCookieOptions);
  res.cookie("refresh_token", refresh_token, refreshTokenCookieOptions);
  res.cookie("logged_in", true, {
    ...accessTokenCookieOptions,
    httpOnly: false,
  });

  res.status(200).json({
    status: "success",
  });
};

const logout = async (req: Request, res: Response) => {
  // await redisClient.del(res.locals.user.id);
  res.cookie("access_token", "", { maxAge: 1 });
  res.cookie("refresh_token", "", { maxAge: 1 });
  res.cookie("logged_in", "", { maxAge: 1 });

  res.status(200).json({
    status: "success",
  });
};

export default {
  register: asyncHandler(register),
  login: asyncHandler(login),
  logout: asyncHandler(logout),
};
