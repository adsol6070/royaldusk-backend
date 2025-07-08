import { Request, Response } from "express";
import { PackageService } from "../services/package.service";
import { asyncHandler } from "@repo/utils/asyncHandler";
import { Prisma } from "@repo/database";
import { ApiError } from "@repo/utils/ApiError";
import path from "path";
import fs from "fs";

const createPackage = async (req: Request, res: Response): Promise<void> => {
  const filename = req.file?.filename || "";
  const baseUrl = process.env.BASE_URL;
  const image = filename
    ? `${baseUrl}/package-service/uploads/package-thumbnails/${filename}`
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

const getPackagesByLocationID = async (
  req: Request,
  res: Response
): Promise<void> => {
  const locationId = req.params.locationId;
  console.log("Fetching packages for locationId:", locationId);
  const packages = await PackageService.getPackages({ locationId });
  console.log("Fetched packages for locationId:", packages);
  res.status(200).json({
    success: true,
    message: "Packages retrieved successfully",
    data: packages,
  });
};

const updatePackage = async (
  req: Request<{ id: string }, any, any>,
  res: Response
): Promise<void> => {
  const { id: packageId } = req.params;
  const {
    name,
    slug,
    description,
    importantInfo,
    locationId,
    price,
    duration,
    categoryID,
    availability,
    hotels,
    policyID,
    timeline,
    inclusionIDs,
    exclusionIDs,
    featureIDs,
  } = req.body;

  const data: Prisma.PackageUpdateInput = {
    name,
    slug,
    description,
    importantInfo,
    location: { connect: { id: locationId } },
    price: Number(price),
    duration: Number(duration),
    availability,
    hotels,
    updatedAt: new Date(),
    category: { connect: { id: categoryID } },
    policy: { connect: { id: policyID } },
  };

  if (req.file?.filename) {
    const existingPackage = await PackageService.getPackageByID({
      id: packageId,
    });

    const oldImageUrl = existingPackage?.imageUrl;
    const baseUrl = process.env.BASE_URL;
    const oldFilename = oldImageUrl?.split("/").pop();

    if (oldFilename) {
      const oldFilePath = path.join(
        __dirname,
        "../../uploads/package-thumbnails",
        oldFilename
      );

      fs.unlink(oldFilePath, (err) => {
        if (err) {
          console.error("Failed to delete old image:", err.message);
        }
      });
    }

    data.imageUrl = `${baseUrl}/package-service/uploads/package-thumbnails/${req.file.filename}`;
  }

  const services: { serviceId: string; type: "Inclusion" | "Exclusion" }[] = [
    ...(inclusionIDs ?? []).map((id: string) => ({
      serviceId: id,
      type: "Inclusion",
    })),
    ...(exclusionIDs ?? []).map((id: string) => ({
      serviceId: id,
      type: "Exclusion",
    })),
  ];

  const featureIds: string[] = featureIDs ?? [];

  await PackageService.updatePackage({
    packageId,
    data,
    featureIds,
    services,
    timeline: timeline?.map((dayBlock: any) => ({
      day: dayBlock.day,
      entries: dayBlock.entries.map((entry: any) => ({
        itineraryId: entry.itineraryId,
      })),
    })),
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
  const pkg = await PackageService.updateAvailability(
    req.params.id,
    req.body.availability
  );
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
  getPackagesByLocationID: asyncHandler(getPackagesByLocationID),
  updatePackage: asyncHandler(updatePackage),
  deletePackage: asyncHandler(deletePackage),
  updatePackageAvailability: asyncHandler(updatePackageAvailability),
};
