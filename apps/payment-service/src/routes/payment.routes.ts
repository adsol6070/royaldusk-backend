import express from "express";
import paymentController from "../controllers/payment.controller";

const paymentRoutes = express.Router();

paymentRoutes.post(
  "/checkout-session",
  paymentController.createCheckoutSession
);
paymentRoutes.post("/create-intent", paymentController.createPaymentIntent);
paymentRoutes.get(
  "/confirmation-pdf/:bookingId",
  paymentController.getConfirmationPdf
);

export default paymentRoutes;