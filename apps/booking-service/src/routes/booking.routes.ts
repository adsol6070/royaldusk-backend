import { Router } from "express";
import { bookingController } from "../controllers";
import {
  validateCreateBooking,
  validateBookingIdParam,
  validateUpdateBookingStatus,
  validateEmailQuery,
} from "../validations/booking.validation";

import { deserializeUser, requireUser } from "@repo/auth-middleware";
import { validateRequest } from "@repo/middlewares/validateRequest";
import config from "config";

const router = Router();

const excludedFields = [
  "password",
  "verified",
  "verificationCode",
  "passwordResetAt",
  "passwordResetToken",
];

const publicKey = Buffer.from(
  config.get<string>("accessTokenPublicKey"),
  "base64"
).toString("ascii");

//
// ✅ PUBLIC ROUTES
//

// Create a new booking (guest or user)
router.post(
  "/",
  validateCreateBooking,
  validateRequest,
  bookingController.createBooking
);

// Get booking by ID (public)
router.get(
  "/:bookingId",
  validateBookingIdParam,
  validateRequest,
  bookingController.getBookingById
);

// Download confirmation PDF (public or auth)
router.get(
  "/:bookingId/download-confirmation",
  bookingController.downloadBookingConfirmation
);

// Get all bookings (admin)
router.get("/", bookingController.getAllBookings);

//
// 🔒 PROTECTED ROUTES (Admin/Internal Use)
//

// Get all bookings by user email
router.post(
  "/userbooking",
  deserializeUser(excludedFields, publicKey),
  requireUser,
  validateEmailQuery,
  validateRequest,
  bookingController.getBookingByEmail
);

// Update booking status
router.patch(
  "/:bookingId/status",
  deserializeUser(excludedFields, publicKey),
  requireUser,
  validateUpdateBookingStatus,
  validateRequest,
  bookingController.updateBookingStatus
);

// Delete a booking
router.delete(
  "/:bookingId",
  deserializeUser(excludedFields, publicKey),
  requireUser,
  validateBookingIdParam,
  validateRequest,
  bookingController.deleteBooking
);

export default router;
