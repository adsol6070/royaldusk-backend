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
  console.log(`🎯 Stripe webhook received: ${req.method} ${req.url}`);

  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") {
    console.log(`❌ Missing Stripe signature in webhook request`);
    throw new ApiError(400, "Missing Stripe signature.");
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log(`✅ Webhook signature verified successfully for event: ${event.type}`);
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err);
    throw new ApiError(400, `Webhook Error: ${(err as Error).message}`);
  }

  console.log(`📨 Processing webhook event: ${event.type} with ID: ${event.id}`);

  if (event.type === "checkout.session.completed") {
    console.log(`🛒 Processing checkout session completed event`);
    await handleCheckoutSessionCompleted(
      event.data.object as Stripe.Checkout.Session
    );
  } else if (event.type.startsWith("payment_intent.")) {
    console.log(`💳 Processing payment intent event: ${event.type}`);
    await handlePaymentIntentEvents(event);
  } else if (event.type.startsWith("charge.")) {
    console.log(`⚡ Processing charge event: ${event.type}`);
    await handleChargeEvents(event);
  } else {
    console.log(`ℹ️ Ignored event type: ${event.type}`);
  }

  console.log(`✅ Webhook processing completed for event: ${event.type}`);
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

// 🆕 Handle successful payment intents (for mobile payments)
const handlePaymentIntentSucceeded = async (intent: Stripe.PaymentIntent) => {
  try {
    // Check if booking already exists (from checkout session or previous processing)
    const existingPayment = await prisma.payment.findFirst({
      where: { providerRefId: intent.id },
      include: { booking: true },
    });

    if (existingPayment) {
      console.log(`✅ Booking already exists for payment intent ${intent.id}`);
      return;
    }

    // Check if this payment intent has metadata for booking creation
    const metadata = intent.metadata;

    if (!metadata || (!metadata.serviceType && !metadata.service_type)) {
      console.log(`ℹ️ No booking metadata found for payment intent ${intent.id}`);
      return;
    }

    // Handle both web (service_type) and mobile (serviceType) metadata formats
    const {
      serviceType,
      serviceId,
      serviceData,
      guestName,
      guestEmail,
      guestMobile,
      guestNationality,
      remarks,
      // Web format fallbacks
      service_type,
      service_id,
      service_data,
      guest_name,
      guest_email,
      guest_phone,
      guest_nationality,
    } = metadata;

    // Use mobile format first, fallback to web format
    const finalServiceType = serviceType || service_type;
    const finalServiceId = serviceId || service_id;
    const finalServiceData = serviceData || service_data;
    const finalGuestName = guestName || guest_name;
    const finalGuestEmail = guestEmail || guest_email;
    const finalGuestMobile = guestMobile || guest_phone;
    const finalGuestNationality = guestNationality || guest_nationality;

    if (!finalServiceType || !finalServiceId || !finalServiceData) {
      console.log(`⚠️ Missing required booking metadata for payment intent ${intent.id}`);
      return;
    }

    if (!finalGuestEmail) {
      throw new Error("Guest email is required but missing");
    }

    console.log(`🔄 Creating booking from payment intent ${intent.id} for ${finalGuestEmail}`);

    // Create booking (exactly like your checkout session handler)
    const booking = await prisma.booking.create({
      data: {
        guestName: finalGuestName || "",
        guestEmail: finalGuestEmail,
        guestMobile: finalGuestMobile || "",
        guestNationality: finalGuestNationality || "",
        remarks: remarks || "",
        agreedToTerms: true,
        status: "Confirmed",
        serviceType: finalServiceType as any,
        serviceId: finalServiceId,
        serviceData: JSON.parse(finalServiceData),
      },
    });

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        provider: "Stripe",
        method: "Card",
        providerRefId: intent.id,
        status: PaymentStatus.succeeded,
        amount: intent.amount || 0,
        currency: (intent.currency || "aed").toUpperCase(),
        chargeId: null,
        receiptUrl: null,
      },
    });

    // Generate PDF
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

    console.log(`✅ Created booking ${booking.id} from payment intent ${intent.id}`);
  } catch (error) {
    console.error("❌ Error creating booking from payment intent:", error);
    throw error;
  }
};

// 🔄 Handle payment intent events (now creates bookings for mobile payments)
const handlePaymentIntentEvents = async (event: Stripe.Event) => {
  const intent = event.data.object as Stripe.PaymentIntent;
  const paymentId = intent.id;

  console.log(`🔍 Processing payment intent event: ${event.type} for ${paymentId}`);
  console.log(`📊 Payment Intent basic info:`, {
    id: intent.id,
    amount: intent.amount,
    currency: intent.currency,
    status: intent.status,
    hasMetadata: !!intent.metadata,
    metadataKeys: intent.metadata ? Object.keys(intent.metadata) : 'NO_METADATA',
  });

  let status: PaymentStatus | null = null;

  switch (event.type) {
    case "payment_intent.created":
      status = PaymentStatus.pending;
      console.log(`✅ Payment intent created: ${paymentId}`);
      break;
    case "payment_intent.processing":
      status = PaymentStatus.processing;
      console.log(`🔄 Payment intent processing: ${paymentId}`);
      break;
    case "payment_intent.succeeded":
      status = PaymentStatus.succeeded;
      console.log(`🎉 Payment intent succeeded: ${paymentId} - triggering booking creation`);
      // 🆕 Handle booking creation for mobile payments
      try {
        await handlePaymentIntentSucceeded(intent);
        console.log(`✅ Booking creation completed for payment intent: ${paymentId}`);
      } catch (bookingError) {
        console.error(`❌ Booking creation failed for payment intent ${paymentId}:`, bookingError);
        // Don't throw here to allow payment status update to proceed
      }
      break;
    case "payment_intent.payment_failed":
      status = PaymentStatus.payment_failed;
      console.log(`❌ Payment intent failed: ${paymentId}`);
      break;
    case "payment_intent.canceled":
      status = PaymentStatus.canceled;
      console.log(`🚫 Payment intent canceled: ${paymentId}`);
      break;
  }

  if (status) {
    console.log(`📝 Updating payment status to: ${status} for ${paymentId}`);
    try {
      const updated = await prisma.payment.update({
        where: { providerRefId: paymentId },
        data: { status },
        include: { booking: true },
      });

      console.log(`✅ Payment status updated successfully for ${paymentId}`);

      if (
        status === PaymentStatus.succeeded &&
        updated.booking.status !== "Confirmed"
      ) {
        console.log(`📝 Updating booking status to Confirmed for booking ${updated.bookingId}`);
        await prisma.booking.update({
          where: { id: updated.bookingId },
          data: { status: "Confirmed" },
        });
        console.log(`✅ Booking status updated to Confirmed`);
      }

      if (
        [PaymentStatus.payment_failed, PaymentStatus.canceled].includes(status)
      ) {
        console.log(`🚫 Handling failed payment for booking ${updated.bookingId}`);
        await handleFailedPayment(updated.bookingId);
      }
    } catch (error) {
      // 🎯 Payment record might not exist yet (checkout session not processed)
      if (
        error instanceof Error &&
        error.message.includes("Record to update not found")
      ) {
        console.log(
          `⏳ Payment record not found for ${paymentId}, might be processed by other events later`
        );
      } else {
        console.error(`❌ Error updating payment intent ${paymentId}:`, error);
        throw error;
      }
    }
  } else {
    console.log(`ℹ️ No status update needed for event type: ${event.type}`);
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