import { Request, Response } from "express";
import { PackageService } from "../services/package.service";
import { asyncHandler } from "@repo/utils/asyncHandler";
import { Prisma } from "@repo/database";
import { ApiError } from "@repo/utils/ApiError";
import path from "path";
import fs from "fs";

const createPackage = async (req: Request, res: Response): Promise<void> => {
  const filename = req.file?.filename || "";
  const image = filename
    ? `http://localhost:8081/package-service/uploads/package-thumbnails/${filename}`
    : "";

  const packageData = {
    ...req.body,
    price: parseFloat(req.body.price),
    duration: parseInt(req.body.duration),
    imageUrl: image,
    createdAt: new Date(),
  };

  const newPackage = await PackageService.createPackage(packageData);
  res.status(201).json({
    success: true,
    message: "Package created successfully",
    data: newPackage,
  });
};

const getPackageByID = async (req: Request, res: Response): Promise<void> => {
  const pkg = await PackageService.getPackageByID({ id: req.params.id });
  if (!pkg) {
    res.status(404).json({
      success: false,
      message: "Package not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Package retrieved successfully",
    data: pkg,
  });
};

const getAllPackages = async (_req: Request, res: Response): Promise<void> => {
  const packages = await PackageService.getAllPackages();
  res.status(200).json({
    success: true,
    message: "All packages retrieved successfully",
    data: packages,
  });
};

const getPackagesByCategoryID = async (
  req: Request,
  res: Response
): Promise<void> => {
  const categoryID = req.params.categoryID;
  const packages = await PackageService.getPackages({ categoryID });
  res.status(200).json({
    success: true,
    message: "Packages retrieved successfully",
    data: packages,
  });
};

const updatePackage = async (
  req: Request<
    { id: string },
    any,
    {
      data?: Prisma.PackageUpdateInput;
      itineraryIds?: string[];
      featureIds?: string[];
      services?: { serviceId: string; type: "Inclusion" | "Exclusion" }[];
    }
  >,
  res: Response
): Promise<void> => {
  const { id: packageId } = req.params;
  const { data, featureIds, itineraryIds, services } = req.body;

  const updatedData: Prisma.PackageUpdateInput = {
    ...data,
    updatedAt: new Date(),
  };

  if (req.file?.path) {
    updatedData.imageUrl = req.file.path;
  }

  await PackageService.updatePackage({
    packageId,
    data: updatedData,
    featureIds,
    itineraryIds,
    services,
  });

  res.status(200).json({
    success: true,
    message: "Package updated successfully",
  });
};

const deletePackage = async (req: Request, res: Response): Promise<void> => {
  const pkg = await PackageService.getPackageByID({ id: req.params.id });
  if (!pkg) {
    throw new ApiError(404, "Package not found");
  }

  const thumbnailUrl = pkg.imageUrl;
  const filename = thumbnailUrl?.split("/").pop();

  await PackageService.deletePackage({ id: req.params.id });

  if (filename) {
    const filePath = path.join(
      __dirname,
      "../../uploads/package-thumbnails",
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

const updatePackageAvailability = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const pkg = await PackageService.updateAvailability(req.params.id, req.body.availability);
  res.status(200).json({
    success: true,
    message: "Package availability updated successfully",
    data: pkg,
  });
};

export default {
  createPackage: asyncHandler(createPackage),
  getPackageByID: asyncHandler(getPackageByID),
  getAllPackages: asyncHandler(getAllPackages),
  getPackagesByCategoryID: asyncHandler(getPackagesByCategoryID),
  updatePackage: asyncHandler(updatePackage),
  deletePackage: asyncHandler(deletePackage),
  updatePackageAvailability: asyncHandler(updatePackageAvailability),
};
