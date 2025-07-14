import { OtpType, prisma, Prisma, User } from "@repo/database";
import config from "config";
import { signJwt, verifyJwt } from "@repo/utils/jwt";
import crypto from "crypto";

export const excludedFields = [
  "password",
  "verificationCode",
  "passwordResetAt",
  "passwordResetToken",
];

export const UserService = {
  createUser: async (input: Prisma.UserCreateInput) => {
    return (await prisma.user.create({
      data: input,
    })) as User;
  },

  findUser: async (
    where: Prisma.UserWhereInput,
    select?: Prisma.UserSelect
  ) => {
    return (await prisma.user.findFirst({
      where,
      select,
    })) as User;
  },

  findUniqueUser: async (
    where: Prisma.UserWhereUniqueInput,
    select?: Prisma.UserSelect
  ) => {
    return (await prisma.user.findUnique({
      where,
      select,
    })) as User;
  },

  updateUser: async (
    where: Prisma.UserWhereUniqueInput,
    data: Prisma.UserUpdateInput,
    select?: Prisma.UserSelect
  ) => {
    return (await prisma.user.update({ where, data, select })) as User;
  },

  deleteUser: async (where: Prisma.UserWhereUniqueInput) => {
    return prisma.user.delete({ where });
  },

  // ==================== OTP METHODS ====================

  storeOTP: async (data: {
    email: string;
    otp: string;
    type: OtpType;
    expiresAt: Date;
  }) => {
    // Delete any existing OTPs for this email
    await prisma.otpVerification.deleteMany({
      where: { email: data.email, type: data.type }
    });

    // Create new OTP record
    return prisma.otpVerification.create({
      data: {
        id: crypto.randomUUID(),
        email: data.email,
        otp: data.otp,
        type: data.type,
        expires_at: data.expiresAt,
        verified: false
      }
    });
  },

  verifyOTP: async (email: string, otp: string, type: OtpType): Promise<boolean> => {
    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        email,
        otp,
        type,
        verified: false,
        expires_at: {
          gt: new Date()
        }
      }
    });

    if (!otpRecord) {
      return false;
    }

    // Mark OTP as verified
    await prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { verified: true }
    });

    return true;
  },

  // ==================== TOKEN METHODS ====================

  generateTemporaryToken: async (email: string): Promise<string> => {
    const privateKey = Buffer.from(
      config.get<string>("accessTokenPrivateKey"),
      "base64"
    ).toString("ascii");

    return signJwt(
      { email, type: "temporary" },
      privateKey,
      { expiresIn: "30m" } // 30 minutes for profile completion
    );
  },

  verifyTemporaryToken: async (token: string): Promise<string | null> => {
    try {
      const publicKey = Buffer.from(
        config.get<string>("accessTokenPublicKey"),
        "base64"
      ).toString("ascii");

      const payload = verifyJwt(token, publicKey) as any;

      if (payload.type === "temporary" && payload.email) {
        return payload.email;
      }

      return null;
    } catch (error) {
      return null;
    }
  },

  signTokens: async (user: any) => {
    const accessTokenPrivateKey = Buffer.from(
      config.get<string>("accessTokenPrivateKey"),
      "base64"
    ).toString("ascii");

    const refreshTokenPrivateKey = Buffer.from(
      config.get<string>("refreshTokenPrivateKey"),
      "base64"
    ).toString("ascii");

    const access_token = signJwt(
      { sub: user.id, role: user.role },
      accessTokenPrivateKey,
      {
        expiresIn: `${config.get<number>("accessTokenExpiresIn")}m`,
      }
    );

    const refresh_token = signJwt(
      { sub: user.id, role: user.role },
      refreshTokenPrivateKey,
      {
        expiresIn: `${config.get<number>("refreshTokenExpiresIn")}m`,
      }
    );

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        id: crypto.randomUUID(),
        user_id: user.id,
        token_hash: crypto.createHash('sha256').update(refresh_token).digest('hex'),
        expires_at: new Date(Date.now() + config.get<number>("refreshTokenExpiresIn") * 60 * 1000)
      }
    });

    return { access_token, refresh_token };
  },

  refreshTokens: async (refreshToken: string) => {
    const token_hash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token_hash,
        expires_at: { gt: new Date() }
      },
      include: { user: true }
    });

    if (!storedToken) {
      throw new Error("Invalid or expired refresh token");
    }

    // Delete old refresh token
    await prisma.refreshToken.delete({
      where: { id: storedToken.id }
    });

    // Generate new tokens
    return await UserService.signTokens(storedToken.user);
  },

  invalidateRefreshToken: async (refreshToken: string) => {
    const token_hash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await prisma.refreshToken.deleteMany({
      where: { token_hash }
    });
  },

  // ==================== APPLE TOKEN VERIFICATION ====================

  verifyAppleToken: async (identityToken: string) => {
    // Implement Apple token verification
    // This is a simplified version - you'll need proper Apple JWT verification
    try {
      // Validate JWT format (should have 3 parts: header.payload.signature)
      const tokenParts = identityToken.split('.');
      if (tokenParts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      const payloadPart = tokenParts[1];
      if (!payloadPart) {
        throw new Error("Missing JWT payload");
      }

      // Decode JWT without verification for demo (NOT SECURE)
      const payload = JSON.parse(
        Buffer.from(payloadPart, 'base64').toString()
      );

      // Validate required fields
      if (!payload.sub) {
        throw new Error("Missing subject in token");
      }

      return {
        sub: payload.sub,
        email: payload.email || null,
        name: payload.name || null
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Invalid Apple token: ${error.message}`);
      }
      throw new Error("Invalid Apple token");
    }
  },

  // ==================== CLEANUP METHODS ====================

  cleanupExpiredOTPs: async () => {
    await prisma.otpVerification.deleteMany({
      where: {
        expires_at: { lt: new Date() }
      }
    });
  },

  cleanupExpiredTokens: async () => {
    await prisma.refreshToken.deleteMany({
      where: {
        expires_at: { lt: new Date() }
      }
    });
  }
};
