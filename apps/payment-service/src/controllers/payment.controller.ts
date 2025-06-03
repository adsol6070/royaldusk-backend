import { Request, Response } from "express";
import { prisma } from "@repo/database";
import { paymentProviders } from "../services/payment.service";
import { asyncHandler } from "@repo/utils/asyncHandler";
import { ApiError } from "@repo/utils/ApiError";

const validProviders = [
  "Stripe",
  "Razorpay",
  "PayPal",
  "Cash",
  "UPI",
  "BankTransfer",
] as const;

const validMethods = ["Card", "Wallet", "UPI", "NetBanking", "Cash"] as const;

type PaymentProviderKey = keyof typeof paymentProviders;

const createPaymentIntent = async (req: Request, res: Response) => {
  const { bookingId, amount, currency = "usd", provider, method } = req.body;

  if (!bookingId || !amount || !provider || !method) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!validProviders.includes(provider)) {
    throw new ApiError(400, "Unsupported payment provider");
  }

  if (!validMethods.includes(method)) {
    throw new ApiError(400, "Unsupported payment method");
  }

  const providerKey = provider.toLowerCase() as PaymentProviderKey;

  if (!paymentProviders[providerKey]) {
    return res
      .status(400)
      .json({ error: "Payment provider integration not available" });
  }

  let providerRefId = "";
  let clientSecret = "";

  if (provider === "Stripe") {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        guestName: true,
        guestEmail: true,
        guestMobile: true,
        guestNationality: true,
      },
    });

    if (!booking) {
      throw new ApiError(404, "Booking not found");
    }
    const intent = await paymentProviders.stripe.paymentIntents.create({
      amount,
      currency,
      metadata: { bookingId },
    });
    providerRefId = intent.id;
    clientSecret = intent.client_secret!;
  } else if (provider === "Razorpay") {
    const order = await paymentProviders.razorpay.orders.create({
      amount,
      currency,
      receipt: bookingId,
    });
    providerRefId = order.id;
    clientSecret = order.id;
  }

  await prisma.payment.create({
    data: {
      bookingId,
      provider,
      method,
      providerRefId,
      status: "pending",
      amount,
      currency,
    },
  });

  return res.json({ clientSecret });
};

const paymentController = {
  createPaymentIntent: asyncHandler(createPaymentIntent),
};

export default paymentController;
