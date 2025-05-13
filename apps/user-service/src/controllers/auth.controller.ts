import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import config from "config";

import { UserService } from "../services/user.service";
import { rabbitMQ } from "../services/rabbitmq.service";
import { asyncHandler } from "@repo/utils/asyncHandler";
import { ApiError } from "@repo/utils/ApiError";

const register = async (req: Request, res: Response): Promise<any> => {
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

  const queue = process.env.EMAIL_QUEUE || "emailQueue";

  await rabbitMQ.publishToQueue(queue, {
    to: user.email,
    subject: "Verify your email address",
    templateName: "verify-email",
    templateData: {
      name: user.name,
      redirectUrl: `${config.get<string>("origin")}/verifyemail/${verifyCode}`,
    },
  });

  res.status(201).json({
    success: true,
    message:
      "Verification email sent. Check your inbox to complete the process.",
  });
};

const login = async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;

  const user = await UserService.findUniqueUser(
    { email: email.toLowerCase() },
    { id: true, email: true, verified: true, password: true }
  );

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError(400, "Invalid email or password.");
  }

  if (!user.verified) {
    throw new ApiError(401, "Please verify your email address.");
  }

  const { access_token, refresh_token } = await UserService.signTokens(user);

  // Return tokens in response body
  res.status(200).json({
    status: "success",
    access_token,
    refresh_token,
  });
};

const logout = async (req: Request, res: Response) => {
  // Implement logout logic by invalidating the refresh token, if needed
  // Example: removing refresh token from storage or database

  res.status(200).json({
    status: "success",
    message: "Successfully logged out",
  });
};

const verifyEmail = async (
  req: Request<{ verificationCode: string }>,
  res: Response
) => {
  const verificationCode = crypto
    .createHash("sha256")
    .update(req.params.verificationCode)
    .digest("hex");

  const user = await UserService.updateUser(
    { verificationCode },
    { verified: true, verificationCode: null },
    { email: true }
  );

  if (!user) {
    throw new ApiError(401, "Could not verify email");
  }

  res.status(200).json({
    status: "success",
    message: "Email verified successfully",
  });
};

export default {
  register: asyncHandler(register),
  login: asyncHandler(login),
  logout: asyncHandler(logout),
  verifyEmail: asyncHandler(verifyEmail),
};
