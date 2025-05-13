import { Request, Response } from "express";
import { BlogService } from "../services/blog.service";
import { asyncHandler } from "@repo/utils/asyncHandler";

const createBlog = async (req: Request, res: Response): Promise<void> => {
  const image = req.file?.path || "";

  const blogData = {
    ...req.body,
    publishedAt: req.body.publishedAt ? new Date(req.body.publishedAt) : null,
    thumbnail: image,
  };

  const blog = await BlogService.createBlog(blogData);
  res.status(201).json({
    success: true,
    message: "Blog created successfully",
    data: blog,
  });
};

const getBlogByID = async (req: Request, res: Response): Promise<void> => {
  const blog = await BlogService.getBlogByID({ id: req.params.id });
  if (!blog) {
    res.status(404).json({
      success: false,
      message: "Blog not found",
    });
    return;
  }
  
  res.status(200).json({
    success: true,
    message: "Blog retrieved successfully",
    data: blog,
  });
};

const getBlogsByCategoryID = async (
  req: Request,
  res: Response
): Promise<void> => {
  const categoryID = req.params.categoryID;
  const blogs = await BlogService.getBlogs({ categoryID });
  res.status(200).json({
    success: true,
    message: "Blogs retrieved successfully",
    data: blogs,
  });
};

const getBlogsByAuthorID = async (
  req: Request,
  res: Response
): Promise<void> => {
  const authorID = req.params.authorID;
  const blogs = await BlogService.getBlogs({ authorID });
  res.status(200).json({
    success: true,
    message: "Blogs retrieved successfully",
    data: blogs,
  });
};

const getAllBlogs = async (_req: Request, res: Response): Promise<void> => {
  const blogs = await BlogService.getAllBlogs();
  res.status(200).json({
    success: true,
    message: "All blogs retrieved successfully",
    data: blogs,
  });
};

const updateBlog = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const blogID = req.params.id;
  const tags = req.body.tags ? JSON.parse(req.body.tags) : [];

  const updatedData: any = {
    ...req.body,
    updatedAt: new Date(),
    tags,
  };

  if (req.file?.path) {
    updatedData.thumbnail = req.file.path;
  }

  const blog = await BlogService.updateBlog(blogID, updatedData);
  res.status(200).json({
    success: true,
    message: "Blog updated successfully",
    data: blog,
  });
};

const deleteBlog = async (req: Request, res: Response): Promise<void> => {
  await BlogService.deleteBlog({ id: req.params.id });
  res.status(204).send();
};

const updateBlogStatus = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const blog = await BlogService.updateStatus(req.params.id, req.body.status);
  res.status(200).json({
    success: true,
    message: "Blog status updated successfully",
    data: blog,
  });
};

export default {
  createBlog: asyncHandler(createBlog),
  getBlogByID: asyncHandler(getBlogByID),
  getBlogsByCategoryID: asyncHandler(getBlogsByCategoryID),
  getAllBlogs: asyncHandler(getAllBlogs),
  getBlogsByAuthorID: asyncHandler(getBlogsByAuthorID),
  updateBlog: asyncHandler(updateBlog),
  deleteBlog: asyncHandler(deleteBlog),
  updateBlogStatus: asyncHandler(updateBlogStatus),
};
