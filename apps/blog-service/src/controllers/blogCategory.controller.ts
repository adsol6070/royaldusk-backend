import { Request, Response } from "express";
import { BlogCategoryService } from "../services/blogCategory.service";
import { asyncHandler } from "@repo/utils/asyncHandler";

const createCategory = async (req: Request, res: Response): Promise<void> => {
  const category = await BlogCategoryService.createCategory(req.body);
  res.status(201).json({
    success: true,
    message: "Category created successfully",
    data: category,
  });
};

const getCategoryByID = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const category = await BlogCategoryService.getCategoryByID(req.params.id);
  if (!category) {
    res.status(404).json({
      success: false,
      message: "Category not found",
    });
    return;
  }
  res.status(200).json({
    success: true,
    message: "Category retrieved successfully",
    data: category,
  });
};

const getAllCategories = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const categories = await BlogCategoryService.getAllCategories();
  res.status(200).json({
    success: true,
    message: "Categories retrieved successfully",
    data: categories,
  });
};

const updateCategory = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const category = await BlogCategoryService.updateCategory(
    req.params.id,
    req.body
  );
  res.status(200).json({
    success: true,
    message: "Category updated successfully",
    data: category,
  });
};

const deleteCategory = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  await BlogCategoryService.deleteCategory(req.params.id);
  res.status(204).send();
};

export default {
  createCategory: asyncHandler(createCategory),
  getCategoryByID: asyncHandler(getCategoryByID),
  getAllCategories: asyncHandler(getAllCategories),
  updateCategory: asyncHandler(updateCategory),
  deleteCategory: asyncHandler(deleteCategory),
};
