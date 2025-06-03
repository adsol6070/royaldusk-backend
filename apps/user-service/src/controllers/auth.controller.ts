import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import config from "config";

import { UserService } from "../services/user.service";
import { rabbitMQ } from "../services/rabbitmq.service";
import { asyncHandler } from "@repo/utils/asyncHandler";
import { ApiError } from "@repo/utils/ApiError";
import { Prisma } from "@repo/database";
import { admin } from "@repo/utils/FirebaseAdmin";

const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
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

    await rabbitMQ.publishToQueue("email.verify", {
      to: user.email,
      subject: "Verify your email",
      templateName: "verify-email",
      templateData: {
        name: user.name,
        redirectUrl: `${config.get<string>("origin")}/verifyemail/${verifyCode}`,
      },
    });

    res.status(201).json({
      status: "success",
      message:
        "Verification email sent. Check your inbox to complete the process.",
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new ApiError(
          409,
          "Registration failed. Please use a different email."
        );
      }
    }
    next(error);
  }
};

const login = async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;

  const user = await UserService.findUniqueUser(
    { email: email.toLowerCase() },
    { id: true, email: true, verified: true, password: true, role: true }
  );

  if (
    !user ||
    !user.password ||
    !(await bcrypt.compare(password, user.password))
  ) {
    throw new ApiError(400, "Invalid email or password.");
  }

  if (!user.verified) {
    return res.status(401).json({
      status: "fail",
      message: "Invalid email or password.",
    });
  }
  console.log("User found:", user);
  const { access_token, refresh_token } = await UserService.signTokens(user);

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

const verifyEmail = async (req: Request, res: Response) => {
  const verificationCode = crypto
    .createHash("sha256")
    .update(req.body.verificationCode)
    .digest("hex");

  const user = await UserService.findUser({ verificationCode });

  if (!user) {
    throw new ApiError(401, "Invalid or expired verification code");
  }

  await UserService.updateUser(
    { id: user.id },
    { verified: true, verificationCode: null }
  );

  res.status(200).json({
    status: "success",
    message: "Email verified successfully",
  });
};

const forgotPassword = async (req: Request, res: Response) => {
  const genericMessage =
    "If a user with that email exists and is verified, you will receive a password reset email shortly.";

  const email = req.body.email?.toLowerCase().trim();
  const user = await UserService.findUser({ email });

  if (!user || !user.verified) {
    console.log(`Password reset attempted for non-existent user: ${email}`);
    return res.status(200).json({ status: "success", message: genericMessage });
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  await UserService.updateUser(
    { id: user.id },
    {
      passwordResetToken: hashedToken,
      passwordResetAt: new Date(Date.now() + 10 * 60 * 1000),
    },
    { email: true }
  );

  const resetUrl = `${config.get<string>("origin")}/auth/resetpassword/${rawToken}`;

  await rabbitMQ.publishToQueue("email.reset", {
    to: user.email,
    subject: "Reset your password",
    templateName: "reset-password",
    templateData: {
      name: user.name,
      resetUrl,
    },
  });

  res.status(200).json({
    status: "success",
    message: genericMessage,
  });
};

const resetPassword = async (req: Request, res: Response) => {
  const { token, password } = req.body;

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await UserService.findUser({
    passwordResetToken: hashedToken,
  });

  if (
    !user ||
    !user.passwordResetAt ||
    user.passwordResetAt.getTime() < Date.now()
  ) {
    throw new ApiError(400, "Reset token is invalid or has expired.");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await UserService.updateUser(
    { id: user.id },
    {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetAt: null,
    }
  );

  res.status(200).json({
    status: "success",
    message: "Password has been reset successfully.",
  });
};

const resendVerificationEmail = async (
  req: Request,
  res: Response
): Promise<any> => {
  const { email } = req.body;

  const user = await UserService.findUniqueUser(
    { email: email.toLowerCase() },
    { id: true, email: true, verified: true, name: true }
  );

  if (user && !user.verified) {
    const verifyCode = crypto.randomBytes(32).toString("hex");
    const verificationCode = crypto
      .createHash("sha256")
      .update(verifyCode)
      .digest("hex");

    await UserService.updateUser({ id: user.id }, { verificationCode });

    await rabbitMQ.publishToQueue("email.verify", {
      to: user.email,
      subject: "Verify your email",
      templateName: "verify-email",
      templateData: {
        name: user.name,
        redirectUrl: `${config.get<string>("origin")}/auth/verifyemail/${verifyCode}`,
      },
    });
  }

  return res.status(200).json({
    success: true,
    message: "If your account needs verification, a link will be sent.",
  });
};

const googleLogin = async (req: Request, res: Response) => {
  const { idToken } = req.body;
  if (!idToken) {
    throw new ApiError(400, "ID token is required");
  }

  const decodedToken = await admin.auth().verifyIdToken(idToken);
  const { uid, email, name, picture } = decodedToken;

  if (!email) throw new ApiError(400, "Email is required from Google");

  const user = await UserService.upsertUserFromGoogle({
    firebaseUid: uid,
    email: email.toLowerCase(),
    name: name || "Unnamed",
    image: picture,
  });
  if (!user.verified) {
    // Optional: mark Google sign-in users as verified
    await UserService.updateUser({ id: user.id }, { verified: true });
  }

  const { access_token, refresh_token } = await UserService.signTokens(user);

  return res.status(200).json({
    status: "success",
    access_token,
    refresh_token,
  });
};

export default {
  register: asyncHandler(register),
  login: asyncHandler(login),
  logout: asyncHandler(logout),
  verifyEmail: asyncHandler(verifyEmail),
  forgotPassword: asyncHandler(forgotPassword),
  resetPassword: asyncHandler(resetPassword),
  resendVerificationEmail: asyncHandler(resendVerificationEmail),
  googleLogin: asyncHandler(googleLogin),
};
