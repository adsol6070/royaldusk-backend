// controller/location.controller.ts
import { Request, Response } from "express";
import { LocationService } from "../services/packageLocation.service";
import { asyncHandler } from "@repo/utils/asyncHandler";
import { ApiError } from "@repo/utils/ApiError";
import path from "path";
import fs from "fs";

// Create a new location
const createLocation = async (req: Request, res: Response): Promise<void> => {
  const filename = req.file?.filename || "";
  const imageUrl = filename
    ? `http://localhost:8081/package-service/uploads/location-images/${filename}`
    : req.body.imageUrl;

  const location = await LocationService.createLocation({
    name: req.body.name,
    imageUrl,
  });

  res.status(201).json({
    success: true,
    message: "Location created successfully",
    data: location,
  });
};

// Get single location by ID
const getLocationByID = async (req: Request, res: Response): Promise<void> => {
  const location = await LocationService.getLocationByID({ id: req.params.id });

  if (!location) {
    throw new ApiError(404, "Location not found");
  }

  res.status(200).json({
    success: true,
    message: "Location retrieved successfully",
    data: location,
  });
};

// Get all locations
const getAllLocations = async (_req: Request, res: Response): Promise<void> => {
  const locations = await LocationService.getAllLocations();

  res.status(200).json({
    success: true,
    message: "All locations retrieved successfully",
    data: locations,
  });
};

// Update location by ID
const updateLocation = async (req: Request, res: Response): Promise<void> => {
  const { id }: any = req.params;

  const existing = await LocationService.getLocationByID({ id });
  if (!existing) {
    throw new ApiError(404, "Location not found");
  }

  let imageUrl = existing.imageUrl;
  if (req.file?.filename) {
    const oldFilename = imageUrl?.split("/").pop();
    if (oldFilename) {
      const oldPath = path.join(
        __dirname,
        "../../uploads/location-images",
        oldFilename
      );
      fs.unlink(oldPath, (err) => {
        if (err) console.error("Failed to delete old image:", err.message);
      });
    }

    imageUrl = `http://localhost:8081/package-service/uploads/location-images/${req.file.filename}`;
  } else if (req.body.imageUrl) {
    imageUrl = req.body.imageUrl;
  }

  const updated = await LocationService.updateLocation(id, {
    name: req.body.name,
    imageUrl,
  });

  res.status(200).json({
    success: true,
    message: "Location updated successfully",
    data: updated,
  });
};

// Delete location by ID
const deleteLocation = async (req: Request, res: Response): Promise<void> => {
  const { id }: any = req.params;
  const existing = await LocationService.getLocationByID({ id });
  if (!existing) {
    throw new ApiError(404, "Location not found");
  }

  const filename = existing.imageUrl?.split("/").pop();
  if (filename) {
    const pathToDelete = path.join(
      __dirname,
      "../../uploads/location-images",
      filename
    );
    fs.unlink(pathToDelete, (err) => {
      if (err) console.error("Failed to delete image:", err.message);
    });
  }

  await LocationService.deleteLocation(id);

  res.status(204).send();
};

export default {
  createLocation: asyncHandler(createLocation),
  getLocationByID: asyncHandler(getLocationByID),
  getAllLocations: asyncHandler(getAllLocations),
  updateLocation: asyncHandler(updateLocation),
  deleteLocation: asyncHandler(deleteLocation),
};
