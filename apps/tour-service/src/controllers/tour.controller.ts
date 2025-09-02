import { Request, Response } from "express";
import { asyncHandler } from "@repo/utils/asyncHandler";
import { ApiError } from "@repo/utils/ApiError";
import { TourService } from "../services/tour.service";
import path from "path";
import fs from "fs";

const createTour = async (req: Request, res: Response): Promise<void> => {
  const filename = req.file?.filename || "";
  const baseUrl = process.env.BASE_URL;
  const image = filename
  ? `${baseUrl}/tour-service/uploads/tour-thumbnails/${filename}`
  : "";

  const tourData = {
    ...req.body,
    price: parseFloat(req.body.price),
    duration: parseInt(req.body.duration),
    imageUrl: image,
    createdAt: new Date(),
  };

  const newTour = await TourService.createTour(tourData);
  res.status(201).json({
    success: true,
    message: "Tour created successfully",
    data: newTour,
  });
};

const getTourByID = async (req: Request, res: Response): Promise<void> => {
  const tour = await TourService.getTourByID({ id: req.params.id });
  if (!tour) {
    res.status(404).json({
      success: false,
      message: "Tour not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Tour retrieved successfully",
    data: tour,
  });
};

const getAllTours = async (_req: Request, res: Response): Promise<void> => {
  const tours = await TourService.getAllTours();
  res.status(200).json({
    success: true,
    message: "All tours retrieved successfully",
    data: tours,
  });
};

const updateTour = async (
  req: Request<{ id: string }, any, any>,
  res: Response
): Promise<void> => {
  const tourId = req.params.id;
  const baseUrl = process.env.BASE_URL;

  const existingTour = await TourService.getTourByID({ id: tourId });
  if (!existingTour) {
    throw new ApiError(404, "Tour not found");
  }

  const data: any = {
    ...req.body,
    price: parseFloat(req.body.price),
    duration: Number(req.body.duration),
    updatedAt: new Date(),
  };

  if (req.file?.filename) {
    const oldImageUrl = existingTour?.imageUrl;
    const oldFilename = oldImageUrl?.split("/").pop();

    if (oldFilename) {
      const oldFilePath = path.join(
        __dirname,
        "../../uploads/tour-thumbnails",
        oldFilename
      );

      fs.unlink(oldFilePath, (err) => {
        if (err) {
          console.error("Failed to delete old image:", err.message);
        }
      });
    }

    data.imageUrl = `${baseUrl}tour-service/uploads/tour-thumbnails/${req.file.filename}`;
  }

  const updatedTour = await TourService.updateTour(tourId, data);
  res.status(200).json({
    success: true,
    message: "Tour updated successfully",
    data: updatedTour,
  });
};

const updateTourAvailibility = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const tour = await TourService.updateAvailability(
    req.params.id,
    req.body.availability
  );
  res.status(200).json({
    success: true,
    message: "Tour availability updated successfully",
    data: tour,
  });
};

const deleteTour = async (req: Request, res: Response): Promise<void> => {
  const tour = await TourService.getTourByID({ id: req.params.id });
  if (!tour) {
    throw new ApiError(404, "Tour not found");
  }

  const imageUrl = tour.imageUrl;
  const filename = imageUrl?.split("/").pop();

  await TourService.deleteTour({ id: req.params.id });

  if (filename) {
    const filePath = path.join(
      __dirname,
      "../../uploads/tour-thumbnails",
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

export default {
  createTour: asyncHandler(createTour),
  getTourByID: asyncHandler(getTourByID),
  getAllTours: asyncHandler(getAllTours),
  updateTour: asyncHandler(updateTour),
  updateTourAvailibility: asyncHandler(updateTourAvailibility),
  deleteTour: asyncHandler(deleteTour),
};