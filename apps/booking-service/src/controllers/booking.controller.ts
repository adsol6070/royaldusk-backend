import { Request, Response } from "express";
import { BookingService } from "../services/booking.service";
import { asyncHandler } from "@repo/utils/asyncHandler";
import { ApiError } from "@repo/utils/ApiError";

// ✅ Create a new booking
const createBooking = async (req: Request, res: Response): Promise<void> => {
  const userId = res.locals.user?.id || null;

  const bookingData = {
    ...req.body,
    userId,
  };

  const booking = await BookingService.createBooking(bookingData);

  res.status(201).json({
    success: true,
    message: "Booking created successfully",
    data: booking,
  });
};

// ✅ Get all bookings
const getAllBookings = async (_req: Request, res: Response): Promise<void> => {
  const bookings = await BookingService.getAllBookings();
  res.status(200).json({
    success: true,
    message: "Bookings retrieved successfully",
    data: bookings,
  });
};

// ✅ Get booking by ID
const getBookingById = async (req: Request, res: Response): Promise<void> => {
  const { bookingId } = req.params;

  if (!bookingId) {
    throw new ApiError(400, "Booking ID is required");
  }

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

// ✅ Get bookings by email
const getBookingByEmail = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const bookings = await BookingService.getBookingsByEmail(email);

  if (!bookings || bookings.length === 0) {
    throw new ApiError(404, "No bookings found for this email");
  }

  res.status(200).json({
    success: true,
    message: "Bookings retrieved successfully",
    data: bookings,
  });
};

// ✅ Update booking status
const updateBookingStatus = async (req: Request, res: Response): Promise<void> => {
  const { bookingId } = req.params as any;
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

// ✅ Delete entire booking
const deleteBooking = async (req: Request, res: Response): Promise<void> => {
  const { bookingId } = req.params as any;

  const deleted = await BookingService.deleteBooking(bookingId);

  if (!deleted) {
    throw new ApiError(404, "Booking not found or already deleted");
  }

  res.status(200).json({
    success: true,
    message: "Booking deleted successfully",
  });
};

// ✅ Download booking confirmation PDF
const downloadBookingConfirmation = async (req: Request, res: Response): Promise<void> => {
  const { bookingId } = req.params as any;

  const booking = await BookingService.getBookingById(bookingId);
  if (!booking) {
    res.status(403).send("Forbidden");
    return;
  }

  const response = await fetch(
    `http://localhost:8081/payment-service/payment/confirmation-pdf/${bookingId}`,
    { method: "GET" }
  );

  if (!response.ok) {
    throw new ApiError(500, "Failed to download booking confirmation PDF");
  }

  res.set({
    "Content-Type": response.headers.get("Content-Type"),
    "Content-Disposition": `attachment; filename="booking-${bookingId}.pdf"`,
  });

  if (response.body) {
    const { Readable } = require("stream");
    const nodeStream = Readable.fromWeb(response.body as any);
    nodeStream.pipe(res);
  } else {
    throw new ApiError(500, "No response body to pipe");
  }
};

export default {
  createBooking: asyncHandler(createBooking),
  getAllBookings: asyncHandler(getAllBookings),
  getBookingById: asyncHandler(getBookingById),
  getBookingByEmail: asyncHandler(getBookingByEmail),
  updateBookingStatus: asyncHandler(updateBookingStatus),
  deleteBooking: asyncHandler(deleteBooking),
  downloadBookingConfirmation: asyncHandler(downloadBookingConfirmation),
};
