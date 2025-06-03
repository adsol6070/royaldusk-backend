import express from "express";
import paymentController from "../controllers/payment.controller";

const paymentRoutes = express.Router();

paymentRoutes.post("/create-intent", paymentController.createPaymentIntent);

export default paymentRoutes;
