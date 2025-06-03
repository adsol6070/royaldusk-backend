import { Router } from "express";
import { bookingController } from "../controllers";
import {
  validateCreateBooking,
  validateUpdateBookingItem,
  validateBookingIdParam,
  validateUpdateBookingStatus,
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

// Create a new booking (public access)
router.post(
  "/",
  validateCreateBooking,
  validateRequest,
  bookingController.createBooking
);

// Get booking by ID (public access)
router.get(
  "/:bookingId",
  validateBookingIdParam,
  validateRequest,
  bookingController.getBookingById
);

router.get("/", bookingController.getAllBookings);
//
// 🔒 PROTECTED ROUTES (Admin/Internal Use)
//

router.patch(
  "/item/:id",
  deserializeUser(excludedFields, publicKey),
  requireUser,
  validateUpdateBookingItem,
  validateRequest,
  bookingController.updateBookingItem
);

router.patch(
  "/:bookingId/status",
  deserializeUser(excludedFields, publicKey),
  requireUser,
  validateUpdateBookingStatus,
  validateRequest,
  bookingController.updateBookingStatus
);

router.delete(
  "/item/:id",
  deserializeUser(excludedFields, publicKey),
  requireUser,
  validateUpdateBookingItem,
  validateRequest,
  bookingController.deleteBookingItem
);

router.delete( 
  "/:bookingId",
  deserializeUser(excludedFields, publicKey),
  requireUser,
  validateBookingIdParam,
  validateRequest,
  bookingController.deleteBooking
);

export default router;
