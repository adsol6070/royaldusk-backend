require("dotenv").config();
import express from "express";
import cors from "cors";
import path from "path";
import paymentRoutes from "./routes/payment.routes";
import stripeWebhook from "./webhook/stripe.webhook";

const app = express();

app.use(
  "/uploads/booking-confirmations",
  express.static(path.join(__dirname, "..", "uploads", "booking-confirmations"))
);

app.post(
  "/payment/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook.handleStripeWebhook
);

app.use(express.json());
app.use(cors());

app.use("/payment", paymentRoutes);

const PORT = process.env.PORT || 5006;
app.listen(PORT, () => {
  console.log(`Payment service running on port ${PORT}`);
});
