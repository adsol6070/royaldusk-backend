import { Request, Response } from "express";
import { prisma } from "@repo/database";
import { paymentProviders } from "../services/payment.service";
import { asyncHandler } from "@repo/utils/asyncHandler";
import { ApiError } from "@repo/utils/ApiError";
import fs from "fs";
import path from "path";
import Stripe from "stripe";

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

const getCountryCodeFromNationality = (nationality: string | null): string => {
  if (!nationality) return "US";

  const nationalityMap: { [key: string]: string } = {
    indian: "IN",
    american: "US",
    british: "GB",
    canadian: "CA",
    australian: "AU",
    german: "DE",
    french: "FR",
    italian: "IT",
    spanish: "ES",
    japanese: "JP",
    chinese: "CN",
    brazilian: "BR",
    mexican: "MX",
    "south african": "ZA",
    nigerian: "NG",
    pakistani: "PK",
    bangladeshi: "BD",
    thai: "TH",
    indonesian: "ID",
    malaysian: "MY",
    singaporean: "SG",
    filipino: "PH",
    vietnamese: "VN",
    korean: "KR",
  };

  return nationalityMap[nationality.toLowerCase()] || "US";
};

const createCheckoutSession = async (req: Request, res: Response) => {
  const {
    amount,
    currency = "aed",
    successUrl,
    cancelUrl,
    metadata,
  } = req.body;

  if (!amount || !successUrl || !cancelUrl || !metadata) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const {
      guestName,
      guestEmail,
      guestMobile,
      guestNationality,
      serviceType,
      serviceId,
      serviceData,
      remarks,
      paymentMethod,
    } = metadata;

    if (!guestEmail || !serviceType || !serviceId || !serviceData) {
      return res.status(400).json({
        error: "Missing service or guest information in metadata",
      });
    }

    // Create or retrieve Stripe customer
    let stripeCustomer = null;
    try {
      const existingCustomers = await paymentProviders.stripe.customers.list({
        email: guestEmail,
        limit: 1,
      });

      if (existingCustomers.data.length > 0 && existingCustomers.data[0]) {
        stripeCustomer = await paymentProviders.stripe.customers.update(
          existingCustomers.data[0].id,
          {
            name: guestName,
            phone: guestMobile,
            metadata: {
              nationality: guestNationality || "",
              last_updated: new Date().toISOString(),
              created_from: "royal_dusk_checkout",
            },
          }
        );
      } else {
        stripeCustomer = await paymentProviders.stripe.customers.create({
          name: guestName,
          email: guestEmail,
          phone: guestMobile,
          metadata: {
            nationality: guestNationality || "",
            created_from: "royal_dusk_checkout",
            created_at: new Date().toISOString(),
          },
          address: guestNationality
            ? {
              country: getCountryCodeFromNationality(guestNationality),
            }
            : undefined,
        });
      }
    } catch (err) {
      console.error("⚠️ Stripe customer error:", err);
      stripeCustomer = null;
    }

    const lineItems = [
      {
        price_data: {
          currency,
          product_data: {
            name: `${serviceType} Service`,
            description: `Booking for ${serviceType}`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ];

    const sessionData: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        guest_name: guestName || "",
        guest_email: guestEmail,
        guest_phone: guestMobile || "",
        guest_nationality: guestNationality || "",
        remarks: remarks || "",
        payment_method: paymentMethod || "Credit Card",
        service_type: serviceType,
        service_id: serviceId,
        service_data: JSON.stringify(serviceData),
        booking_source: "royal_dusk_web",
      },
      billing_address_collection: "required",
      phone_number_collection: {
        enabled: true,
      },
    };

    if (stripeCustomer?.id) {
      sessionData.customer = stripeCustomer.id;
    } else if (guestEmail) {
      sessionData.customer_email = guestEmail;
    }

    const session =
      await paymentProviders.stripe.checkout.sessions.create(sessionData);

    return res.json({
      sessionId: session.id,
      sessionUrl: session.url,
      customerId: stripeCustomer?.id,
      message: "Checkout session created successfully",
    });
  } catch (error) {
    console.error("❌ Checkout session creation failed:", error);
    return res.status(500).json({
      error: "Failed to create checkout session",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

const createPaymentIntent = async (req: Request, res: Response) => {
  const {
    amount,
    currency = "aed",
    metadata,
  } = req.body;

  if (!amount || !metadata) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const {
      guestName,
      guestEmail,
      guestMobile,
      guestNationality,
      serviceData, // This contains package info
      totalAmount,
      remarks,
      paymentMethod,
      serviceType,
      serviceId,
    } = metadata;

    if (!guestEmail) {
      return res.status(400).json({
        error: "Missing guest email in metadata",
      });
    }

    // Handle Stripe customer creation/retrieval (same as your existing code)
    let stripeCustomer = null;
    try {
      const existingCustomers = await paymentProviders.stripe.customers.list({
        email: guestEmail,
        limit: 1,
      });

      if (existingCustomers.data.length > 0 && existingCustomers.data[0]) {
        stripeCustomer = existingCustomers.data[0];
        console.log("📍 Using existing customer:", stripeCustomer.id);

        // Update customer info
        await paymentProviders.stripe.customers.update(stripeCustomer.id, {
          name: guestName,
          phone: guestMobile,
          metadata: {
            nationality: guestNationality || "",
            last_updated: new Date().toISOString(),
            created_from: "royal_dusk_mobile",
          },
        });
      } else if (guestEmail) {
        console.log("✨ Creating new customer for:", guestEmail);

        stripeCustomer = await paymentProviders.stripe.customers.create({
          name: guestName,
          email: guestEmail,
          phone: guestMobile,
          metadata: {
            nationality: guestNationality || "",
            created_from: "royal_dusk_mobile",
            created_at: new Date().toISOString(),
          },
          address: guestNationality
            ? {
              country: getCountryCodeFromNationality(guestNationality),
            }
            : undefined,
        });
        console.log("✅ Created new customer:", stripeCustomer.id);
      }
    } catch (customerError) {
      console.error("⚠️ Customer creation/retrieval failed:", customerError);
      stripeCustomer = null;
    }

    // Create ephemeral key for customer (required for mobile Payment Sheet)
    let ephemeralKey = null;
    if (stripeCustomer?.id) {
      try {
        ephemeralKey = await paymentProviders.stripe.ephemeralKeys.create(
          { customer: stripeCustomer.id },
          { apiVersion: '2023-10-16' }
        );
        console.log("🔑 Created ephemeral key for customer");
      } catch (ephemeralError) {
        console.error("⚠️ Ephemeral key creation failed:", ephemeralError);
      }
    }

    // Create Payment Intent
    const paymentIntentData: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount), // Amount in smallest currency unit (fils for AED)
      currency: currency.toLowerCase(),
      metadata: {
        guest_name: guestName || "",
        guest_email: guestEmail,
        guest_phone: guestMobile || "",
        guest_nationality: guestNationality || "",
        total_amount: amount.toString(),
        currency: currency.toUpperCase(),
        booking_source: "royal_dusk_mobile",
        remarks: remarks || "",
        payment_method: paymentMethod || "Credit Card",
        service_type: serviceType || "Package",
        service_id: serviceId?.toString() || "",
        service_data: serviceData || "", // Package details
      },
      automatic_payment_methods: {
        enabled: true,
      },
    };

    // Add customer to Payment Intent if available
    if (stripeCustomer?.id) {
      paymentIntentData.customer = stripeCustomer.id;
    }

    console.log("🔄 Creating Payment Intent with data:", {
      hasCustomer: !!paymentIntentData.customer,
      amount,
      currency,
      metadataKeys: Object.keys(paymentIntentData.metadata || {}),
    });

    // Create the Payment Intent
    const paymentIntent = await paymentProviders.stripe.paymentIntents.create(paymentIntentData);

    console.log("✅ Payment Intent created successfully:", {
      paymentIntentId: paymentIntent.id,
      customerId: stripeCustomer?.id,
      amount,
      currency,
    });

    return res.json({
      client_secret: paymentIntent.client_secret,
      customer_id: stripeCustomer?.id || null,
      ephemeral_key: ephemeralKey?.secret || null,
      payment_intent_id: paymentIntent.id,
      message: "Payment Intent created successfully",
    });

  } catch (error) {
    console.error("❌ Payment Intent creation failed:", error);

    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        ...((error as any).type && { stripeErrorType: (error as any).type }),
        ...((error as any).code && { stripeErrorCode: (error as any).code }),
      });
    }

    return res.status(500).json({
      error: "Failed to create payment intent",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

const getConfirmationPdf = async (req: Request, res: Response) => {
  const { bookingId } = req.params;

  console.log("Fetching confirmation PDF for bookingId:", bookingId);

  const filePath = path.join(
    __dirname,
    `../../uploads/booking-confirmations/booking-${bookingId}.pdf`
  );

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "PDF not found" });
  }

  res.download(filePath, `booking-${bookingId}.pdf`);
};

const paymentController = {
  createPaymentIntent: asyncHandler(createPaymentIntent),
  createCheckoutSession: asyncHandler(createCheckoutSession),
  getConfirmationPdf: asyncHandler(getConfirmationPdf),
};

export default paymentController;
