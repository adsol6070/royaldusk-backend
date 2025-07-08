import { prisma, Prisma, User } from "@repo/database";
import config from "config";
import { signJwt } from "@repo/utils/jwt";

export const excludedFields = [
  "password",
  "verified",
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
  findManyUsers: async (
    where: Prisma.UserWhereInput,
    select?: Prisma.UserSelect
  ) => {
    return await prisma.user.findMany({ where, select });
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
  signTokens: async (user: Prisma.UserCreateInput) => {
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

    return { access_token, refresh_token };
  },
  rollbackUserAction: async (data: { to: string; templateName: string }) => {
    if (data.templateName === "verify-email") {
      await prisma.user.updateMany({
        where: { email: data.to },
        data: {
          verificationCode: null,
          verified: false,
        },
      });
      console.log(`Rolled back verification info for ${data.to}`);
    } else if (data.templateName === "reset-password") {
      await prisma.user.updateMany({
        where: { email: data.to },
        data: {
          passwordResetToken: null,
          passwordResetAt: null,
        },
      });
      console.log(`Rolled back password reset info for ${data.to}`);
    } else {
      console.warn(
        `No rollback action defined for template ${data.templateName}`
      );
    }
  },
  upsertUserFromGoogle: async (data: {
    firebaseUid: string;
    email: string;
    name: string;
    image?: string;
  }) => {
    return prisma.user.upsert({
      where: { email: data.email },
      update: {
        name: data.name,
      },
      create: {
        name: data.name,
        email: data.email,
        password: "GOOGLE_AUTH", // placeholder, never used
        verified: true,
      },
    });
  },
};
