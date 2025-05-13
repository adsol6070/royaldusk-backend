import { Request, Response } from "express";
import { PackageItineraryService } from "../services/packageItinerary.service";
import { asyncHandler } from "@repo/utils/asyncHandler";

const createItinerary = async (req: Request, res: Response): Promise<void> => {
  const itinerary = await PackageItineraryService.createItinerary(req.body);
  res.status(201).json({
    success: true,
    message: "Package itinerary created successfully",
    data: itinerary,
  });
};

const getItineraryByID = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const itinerary = await PackageItineraryService.getItineraryByID(req.params.id);
  if (!itinerary) {
    res.status(404).json({
      success: false,
      message: "Package itinerary not found",
    });
    return;
  }
  res.status(200).json({
    success: true,
    message: "Package itinerary retrieved successfully",
    data: itinerary,
  });
};

const getAllItinerary = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const itinerary = await PackageItineraryService.getAllItinerary();
  res.status(200).json({
    success: true,
    message: "Package itinerary retrieved successfully",
    data: itinerary,
  });
};

const updateItinerary = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const itinerary = await PackageItineraryService.updateItinerary(
    req.params.id,
    req.body
  );
  if (!itinerary) {
    res.status(404).json({
      success: false,
      message: "Package itinerary not found",
    });
    return;
  }
  res.status(200).json({
    success: true,
    message: "Package itinerary updated successfully",
    data: itinerary,
  });
};

const deleteItinerary = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const itinerary = await PackageItineraryService.deleteItinerary(req.params.id);
  if (!itinerary) {
    res.status(404).json({
      success: false,
      message: "Package itinerary not found",
    });
    return;
  }
  res.status(204).send();
};

export default {
  createItinerary: asyncHandler(createItinerary),
  getItineraryByID: asyncHandler(getItineraryByID),
  getAllItinerary: asyncHandler(getAllItinerary),
  updateItinerary: asyncHandler(updateItinerary),
  deleteItinerary: asyncHandler(deleteItinerary),
};
