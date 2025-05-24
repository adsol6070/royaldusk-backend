import { Request, Response } from "express";
import { PackageService } from "../services/package.service";
import { asyncHandler } from "@repo/utils/asyncHandler";

const createPackage = async (req: Request, res: Response): Promise<void> => {
  const imageUrl = req.file?.path || "";

  const packageData = {
    ...req.body,
    price: parseFloat(req.body.price),
    duration: parseInt(req.body.duration),
    imageUrl: imageUrl,
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
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const packageID = req.params.id;
  console.log("requested body", req.body)

  const updatedData: any = {
    ...req.body,
    updatedAt: new Date(),
  };

  if (req.file?.path) {
    updatedData.imageUrl = req.file.path;
  }

  const updatedPackage = await PackageService.updatePackage(packageID, updatedData);
  res.status(200).json({
    success: true,
    message: "Package updated successfully",
    data: updatedPackage,
  });
};

const deletePackage = async (req: Request, res: Response): Promise<void> => {
  await PackageService.deletePackage({ id: req.params.id });
  res.status(204).send();
};

const updatePackageStatus = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const pkg = await PackageService.updateStatus(req.params.id, req.body.status);
  res.status(200).json({
    success: true,
    message: "Package status updated successfully",
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
  updatePackageStatus: asyncHandler(updatePackageStatus),
};
