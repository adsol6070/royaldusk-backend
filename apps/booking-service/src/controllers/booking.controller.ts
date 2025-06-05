import { Request, Response } from "express";
import { BookingService } from "../services/booking.service";
import { asyncHandler } from "@repo/utils/asyncHandler";
import { ApiError } from "@repo/utils/ApiError";

// Create a new booking (guest or logged-in user)
const createBooking = async (req: Request, res: Response): Promise<void> => {
  console.log("req.body:", req.body);
  const userId = res.locals.user?.id || null;
  console.log("res.locals.user:", req.body);

  const bookingData = {
    ...req.body,
    userId,
  };

  const booking = await BookingService.createBooking(bookingData);
  console.log("booking:", booking);

  res.status(201).json({
    success: true,
    message: "Booking created successfully",
    data: booking,
  });
};

const getAllBookings = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const bookings = await BookingService.getAllBookings();
  res.status(200).json({
    success: true,
    message: "Bookings retrieved successfully",
    data: bookings,
  });
};

// Get booking by ID
const getBookingById = async (req: Request, res: Response): Promise<void> => {
  const { bookingId }: any = req.params;
  const booking = await BookingService.getBookingById(bookingId);

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  res.status(200).json({
    success: true,
    message: "Booking retrieved successfully",
    data: booking,
  });
};

// Update a booking item
const updateBookingItem = async (req: Request, res: Response): Promise<void> => {
  const { id }: any = req.params;

  const updatedItem = await BookingService.updateBookingItem(id, req.body);

  if (!updatedItem) {
    throw new ApiError(404, "Booking item not found");
  }

  res.status(200).json({
    success: true,
    message: "Booking item updated successfully",
    data: updatedItem,
  });
};

const updateBookingStatus = async (req: Request, res: Response): Promise<void> => {
  const { bookingId } = req.params;
  const { status } = req.body;

  const updatedBooking = await BookingService.updateBookingStatus(bookingId, status);

  if (!updatedBooking) {
    throw new ApiError(404, "Booking not found or status update failed");
  }

  res.status(200).json({
    success: true,
    message: "Booking status updated successfully",
    data: updatedBooking,
  });
};

// Delete a specific booking item
const deleteBookingItem = async (req: Request, res: Response): Promise<void> => {
  const { id }: any = req.params;

  const deleted = await BookingService.deleteBookingItem(id);

  if (!deleted) {
    throw new ApiError(404, "Booking item not found or already deleted");
  }

  res.status(200).json({
    success: true,
    message: "Booking item deleted successfully",
  });
};

// Delete entire booking
const deleteBooking = async (req: Request, res: Response): Promise<void> => {
  const { bookingId }: any = req.params;

  const deleted = await BookingService.deleteBooking(bookingId);

  if (!deleted) {
    throw new ApiError(404, "Booking not found or already deleted");
  }

  res.status(200).json({
    success: true,
    message: "Booking deleted successfully",
  });
};

export default {
  createBooking: asyncHandler(createBooking),
  getAllBookings: asyncHandler(getAllBookings),
  getBookingById: asyncHandler(getBookingById),
  updateBookingItem: asyncHandler(updateBookingItem),
  updateBookingStatus: asyncHandler(updateBookingStatus),
  deleteBookingItem: asyncHandler(deleteBookingItem),
  deleteBooking: asyncHandler(deleteBooking),
};
