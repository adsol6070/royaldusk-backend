import { Request, Response } from "express";
import { BlogService } from "../services/blog.service";
import { asyncHandler } from "@repo/utils/asyncHandler";
import { ApiError } from "@repo/utils/ApiError";
import path from "path";
import fs from "fs";

const createBlog = async (req: Request, res: Response): Promise<void> => {
  const filename = req.file?.filename || "";
  const image = filename
    ? `http://localhost:8081/blog-service/uploads/blog-thumbnails/${filename}`
    : "";

  let parsedTags: string[] = [];

  if (Array.isArray(req.body.tags)) {
    parsedTags = req.body.tags;
  } else if (typeof req.body.tags === "string") {
    try {
      parsedTags = JSON.parse(req.body.tags);
    } catch (err) {
      throw new ApiError(400, "Invalid format for tags");
    }
  }

  const blogData = {
    ...req.body,
    tags: parsedTags,
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

  const existingBlog = await BlogService.getBlogByID({ id: blogID });
  if (!existingBlog) {
    throw new ApiError(404, "Blog not found");
  }

  const updatedData: any = {
    ...req.body,
    updatedAt: new Date(),
  };

  if (req.body.tags) {
    if (Array.isArray(req.body.tags)) {
      updatedData.tags = req.body.tags;
    } else if (typeof req.body.tags === "string") {
      try {
        updatedData.tags = JSON.parse(req.body.tags);
      } catch (err) {
        throw new ApiError(400, "Invalid format for tags");
      }
    }
  }

  if (req.file?.filename) {
    const oldThumbnail = existingBlog.thumbnail;
    const oldFilename = oldThumbnail?.split("/").pop();

    updatedData.thumbnail = `http://localhost:8081/blog-service/uploads/blog-thumbnails/${req.file.filename}`;

    if (oldFilename) {
      const oldFilePath = path.join(
        __dirname,
        "../../uploads/blog-thumbnails",
        oldFilename
      );

      fs.unlink(oldFilePath, (err) => {
        if (err) {
          console.error("Failed to delete old image:", err.message);
        }
      });
    }
  }

  const updatedBlog = await BlogService.updateBlog(blogID, updatedData);
  res.status(200).json({
    success: true,
    message: "Blog updated successfully",
    data: updatedBlog,
  });
};

const deleteBlog = async (req: Request, res: Response): Promise<void> => {
  const blog = await BlogService.getBlogByID({ id: req.params.id });
  if (!blog) {
    throw new ApiError(404, "Blog not found");
  }

  const thumbnailUrl = blog.thumbnail;
  const filename = thumbnailUrl?.split("/").pop();

  await BlogService.deleteBlog({ id: req.params.id });

  if (filename) {
    const filePath = path.join(
      __dirname,
      "../../uploads/blog-thumbnails",
      filename
    );

    fs.unlink(filePath, (err) => {
      if (err) {
        console.error("Failed to delete image:", err.message);
      }
    });
  }

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
