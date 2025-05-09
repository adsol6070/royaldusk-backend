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
    where: Partial<Prisma.UserCreateInput>,
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
  signTokens: async (user: Prisma.UserCreateInput) => {
    const access_token = signJwt({ sub: user.id }, "accessTokenPrivateKey", {
      expiresIn: `${config.get<number>("accessTokenExpiresIn")}m`,
    });

    const refresh_token = signJwt({ sub: user.id }, "refreshTokenPrivateKey", {
      expiresIn: `${config.get<number>("refreshTokenExpiresIn")}m`,
    });

    return { access_token, refresh_token };
  },
};
