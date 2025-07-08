import Stripe from "stripe";
import { Request, Response } from "express";
import { stripe } from "../services/stripe.service";
import { prisma } from "@repo/database";
import { ApiError } from "@repo/utils/ApiError";
import { asyncHandler } from "@repo/utils/asyncHandler";
import { generateAndStoreBookingPdf } from "../utils/generateBookingConfirmationPdf";

enum PaymentStatus {
  canceled = "canceled",
  pending = "pending",
  payment_failed = "payment_failed",
  processing = "processing",
  succeeded = "succeeded",
}

const handleStripeWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") {
    throw new ApiError(400, "Missing Stripe signature.");
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err);
    throw new ApiError(400, `Webhook Error: ${(err as Error).message}`);
  }

  if (event.type === "checkout.session.completed") {
    await handleCheckoutSessionCompleted(
      event.data.object as Stripe.Checkout.Session
    );
  } else if (event.type.startsWith("payment_intent.")) {
    await handlePaymentIntentEvents(event);
  } else if (event.type.startsWith("charge.")) {
    await handleChargeEvents(event);
  } else {
    console.log(`ℹ️ Ignored event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
};

const handleCheckoutSessionCompleted = async (
  session: Stripe.Checkout.Session
) => {
  try {
    const metadata = session.metadata;

    if (!metadata) {
      throw new Error("No metadata found in session");
    }

    const {
      service_type,
      service_id,
      service_data,
      guest_name,
      guest_email,
      guest_phone,
      guest_nationality,
      remarks,
    } = metadata;

    if (!service_type || !service_id || !service_data) {
      throw new Error("Missing required booking metadata");
    }

    if (!guest_email) {
      throw new Error("Guest email is required but missing");
    }

    const booking = await prisma.booking.create({
      data: {
        guestName: guest_name || "",
        guestEmail: guest_email,
        guestMobile: guest_phone || "",
        guestNationality: guest_nationality || "",
        remarks: remarks || "",
        agreedToTerms: true,
        status: "Confirmed",
        serviceType: service_type as any,
        serviceId: service_id,
        serviceData: JSON.parse(service_data),
      },
    });

    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        provider: "Stripe",
        method: "Card",
        providerRefId: session.payment_intent as string,
        status: PaymentStatus.succeeded,
        amount: session.amount_total || 0,
        currency: (session.currency || "aed").toUpperCase(),
        chargeId: null,
        receiptUrl: null,
      },
    });

    try {
      const bookingWithPayments = await prisma.booking.findUnique({
        where: { id: booking.id },
        include: { payments: true },
      });

      if (bookingWithPayments) {
        await generateAndStoreBookingPdf(bookingWithPayments);
      }
    } catch (pdfError) {
      console.error("❌ Failed to generate booking PDF:", pdfError);
    }
  } catch (error) {
    console.error("❌ Error creating booking from checkout session:", error);
    throw error; // Let Stripe retry if something fails
  }
};

// 🔄 EXISTING: Handle payment intent events (now updates existing bookings)
const handlePaymentIntentEvents = async (event: Stripe.Event) => {
  const intent = event.data.object as Stripe.PaymentIntent;
  const paymentId = intent.id;

  let status: PaymentStatus | null = null;

  switch (event.type) {
    case "payment_intent.created":
      status = PaymentStatus.pending;
      break;
    case "payment_intent.processing":
      status = PaymentStatus.processing;
      break;
    case "payment_intent.succeeded":
      status = PaymentStatus.succeeded;
      break;
    case "payment_intent.payment_failed":
      status = PaymentStatus.payment_failed;
      break;
    case "payment_intent.canceled":
      status = PaymentStatus.canceled;
      break;
  }

  if (status) {
    try {
      const updated = await prisma.payment.update({
        where: { providerRefId: paymentId },
        data: { status },
        include: { booking: true },
      });

      if (
        status === PaymentStatus.succeeded &&
        updated.booking.status !== "Confirmed"
      ) {
        await prisma.booking.update({
          where: { id: updated.bookingId },
          data: { status: "Confirmed" },
        });
      }

      if (
        [PaymentStatus.payment_failed, PaymentStatus.canceled].includes(status)
      ) {
        await handleFailedPayment(updated.bookingId);
      }
    } catch (error) {
      // 🎯 Payment record might not exist yet (checkout session not processed)
      if (
        error instanceof Error &&
        error.message.includes("Record to update not found")
      ) {
        console.log(
          `⏳ Payment record not found for ${paymentId}, might be processed by checkout session later`
        );
      } else {
        console.error(`❌ Error updating payment intent ${paymentId}:`, error);
        throw error;
      }
    }
  }
};

const handleChargeEvents = async (event: Stripe.Event) => {
  const charge = event.data.object as Stripe.Charge;
  const paymentIntentId = charge.payment_intent as string;

  const updates: any = {
    chargeId: charge.id,
    receiptUrl: charge.receipt_url || null,
    refunded: charge.refunded || false,
    failureCode: charge.failure_code || null,
    failureMessage: charge.failure_message || null,
    cardBrand: charge.payment_method_details?.card?.brand || null,
    cardLast4: charge.payment_method_details?.card?.last4 || null,
  };

  switch (event.type) {
    case "charge.succeeded":
      updates.status = PaymentStatus.succeeded;
      break;
    case "charge.failed":
      updates.status = PaymentStatus.payment_failed;
      break;
    case "charge.refunded":
      updates.status = PaymentStatus.canceled;
      updates.refunded = true;
      break;
    case "charge.updated":
      // Don't change status, just update metadata
      break;
  }

  try {
    const updatedPayments = await prisma.payment.updateMany({
      where: { providerRefId: paymentIntentId },
      data: updates,
    });

    if (["charge.refunded", "charge.failed"].includes(event.type)) {
      const relatedPayment = await prisma.payment.findFirst({
        where: { providerRefId: paymentIntentId },
      });

      if (relatedPayment) {
        await handleFailedPayment(relatedPayment.bookingId);
      }
    }
  } catch (error) {
    console.error(`❌ Error handling charge event ${event.type}:`, error);
    throw error;
  }
};

const handleFailedPayment = async (bookingId: string) => {
  try {
    const allFailedOrCanceled = await prisma.payment.findMany({
      where: {
        bookingId,
        NOT: { status: PaymentStatus.succeeded },
      },
    });

    const hasSuccessfulPayment = await prisma.payment.findFirst({
      where: {
        bookingId,
        status: PaymentStatus.succeeded,
      },
    });

    if (!hasSuccessfulPayment && allFailedOrCanceled.length > 0) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "Cancelled" },
      });
    }
  } catch (error) {
    console.error("❌ Error handling failed payment:", error);
  }
};

export default { handleStripeWebhook: asyncHandler(handleStripeWebhook) };

// 🆕 OPTIONAL: Add FailedBooking model to your Prisma schema
/*
model FailedBooking {
  id              String   @id @default(cuid())
  sessionId       String   @unique
  paymentIntentId String?
  metadata        Json
  error           String
  createdAt       DateTime @default(now())
  reviewed        Boolean  @default(false)
  
  @@map("failed_bookings")
}
*/
