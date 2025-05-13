import { Request, Response } from "express";
import { PackageEnquiryService } from "../services/packageEnquiry.service";
import { asyncHandler } from "@repo/utils/asyncHandler";

const createEnquiry = async (req: Request, res: Response): Promise<void> => {
  const formattedData = {
    ...req.body,
    adults: parseInt(req.body.adults, 10),
    children: parseInt(req.body.children, 10),
  };
  const enquiry = await PackageEnquiryService.createEnquiry(formattedData);
   if (!enquiry) {
    res.status(400).json({
      success: false,
      message: "Bad request",
    });
    return;
  }
  res.status(201).json({
    success: true,
    message: "Package enquiry sent successfully",
    data: enquiry,
  });
};

const getEnquiryByID = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const enquiry = await PackageEnquiryService.getEnquiryByID(req.params.id);
  if (!enquiry) {
    res.status(404).json({
      success: false,
      message: "Package enquiry not found",
    });
    return;
  }
  res.status(200).json({
    success: true,
    message: "Package enquiry retrieved successfully",
    data: enquiry,
  });
};

const getAllEnquiry = async (_req: Request, res: Response): Promise<void> => {
  const enquiry = await PackageEnquiryService.getAllEnquiry();
  res.status(200).json({
    success: true,
    message: "Package enquiry retrieved successfully",
    data: enquiry,
  });
};

const updateEnquiry = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const enquiry = await PackageEnquiryService.updateEnquiry(
    req.params.id,
    req.body
  );
  if (!enquiry) {
    res.status(404).json({
      success: false,
      message: "Package enquiry not found",
    });
    return;
  }
  res.status(200).json({
    success: true,
    message: "Package enquiry updated successfully",
    data: enquiry,
  });
};

const deleteEnquiry = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const enquiry = await PackageEnquiryService.deleteEnquiry(req.params.id);
  if (!enquiry) {
    res.status(404).json({
      success: false,
      message: "Package enquiry not found",
    });
    return;
  }
  res.status(204).send();
};

export default {
  createEnquiry: asyncHandler(createEnquiry),
  getEnquiryByID: asyncHandler(getEnquiryByID),
  getAllEnquiry: asyncHandler(getAllEnquiry),
  updateEnquiry: asyncHandler(updateEnquiry),
  deleteEnquiry: asyncHandler(deleteEnquiry),
};
