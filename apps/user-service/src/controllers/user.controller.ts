import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "@repo/utils/asyncHandler";
import { UserService } from "../services/user.service";
import { ApiError } from "@repo/utils/ApiError";

const getAllUsers = async (req: Request, res: Response) => {
  const users = await UserService.findManyUsers(
    {},
    {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    }
  );

  res.status(200).json({
    status: "success",
    results: users.length,
    data: users,
  });
};

const getUserById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await UserService.findUniqueUser(
    { id },
    {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    }
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res.status(200).json({
    status: "success",
    data: user,
  });
};

const updateUserById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const updatedUser = await UserService.updateUser({ id }, req.body, {
    id: true,
    name: true,
    email: true,
    updatedAt: true,
  });

  if (!updatedUser) {
    throw new ApiError(404, "User not found or not updated");
  }

  res.status(200).json({
    status: "success",
    message: "User updated successfully",
    data: updatedUser,
  });
};

const deleteUserById = async (req: Request, res: Response) => {
  const { id } = req.params;

  const deletedUser = await UserService.deleteUser({ id });

  if (!deletedUser) {
    throw new ApiError(404, "User not found or already deleted");
  }

  res.status(200).json({
    status: "success",
    message: "User deleted successfully",
  });
};

const getMe = async (req: Request, res: Response, next: NextFunction) => {
  const userId = res.locals.user?.id;

  const user = await UserService.findUniqueUser(
    { id: userId },
    {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    }
  );

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
};

export default {
  getAllUsers: asyncHandler(getAllUsers),
  getUserById: asyncHandler(getUserById),
  updateUserById: asyncHandler(updateUserById),
  deleteUserById: asyncHandler(deleteUserById),
  getMe: asyncHandler(getMe),
};
