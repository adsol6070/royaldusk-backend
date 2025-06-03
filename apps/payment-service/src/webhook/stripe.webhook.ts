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
  console.log("🔔 Received Stripe webhook event");

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

  if (event.type.startsWith("payment_intent.")) {
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
      const updated = await prisma.payment.update({
        where: { providerRefId: paymentId },
        data: { status },
        include: { booking: true },
      });

      if (status === PaymentStatus.succeeded) {
        await prisma.booking.update({
          where: { id: updated.bookingId },
          data: { status: "Confirmed" },
        });

        try {
          const booking = await prisma.booking.findUnique({
            where: { id: updated.bookingId },
            include: {
              items: {
                include: {
                  package: true,
                },
              },
              payments: true,
            },
          });

          if (booking) {
            await generateAndStoreBookingPdf(booking);
          }
        } catch (err) {
          console.error("❌ Failed to generate or save PDF:", err);
        }
      }
    }
  } else if (event.type.startsWith("charge.")) {
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

    await prisma.payment.updateMany({
      where: { providerRefId: paymentIntentId },
      data: updates,
    });

    if (["charge.refunded", "charge.failed"].includes(event.type)) {
      const relatedPayment = await prisma.payment.findFirst({
        where: { providerRefId: paymentIntentId },
      });

      if (relatedPayment) {
        const allFailedOrCanceled = await prisma.payment.findMany({
          where: {
            bookingId: relatedPayment.bookingId,
            NOT: { status: PaymentStatus.succeeded },
          },
        });

        const hasSuccessfulPayment = await prisma.payment.findFirst({
          where: {
            bookingId: relatedPayment.bookingId,
            status: PaymentStatus.succeeded,
          },
        });

        if (!hasSuccessfulPayment && allFailedOrCanceled.length > 0) {
          await prisma.booking.update({
            where: { id: relatedPayment.bookingId },
            data: { status: "Cancelled" },
          });
        }
      }
    }

    console.log(
      `💳 Charge event '${event.type}' handled for ${paymentIntentId}`
    );
  } else {
    console.log(`ℹ️ Ignored event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
};

export default { handleStripeWebhook: asyncHandler(handleStripeWebhook) };
