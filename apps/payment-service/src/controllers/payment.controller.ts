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
  console.log("Creating payment intent with body:", req.body);

  const {
    bookingId,
    amount,
    currency = "usd",
    provider,
    method,
    customerInfo,
    metadata,
  } = req.body;

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
  let stripeCustomerId: string | null = null;

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

    let stripeCustomer;

    try {
      const existingCustomers = (await paymentProviders.stripe.customers.list({
        email: booking.guestEmail ?? undefined,
        limit: 1,
      })) as Stripe.ApiList<Stripe.Customer>;

      if (existingCustomers.data.length > 0) {
        if (existingCustomers.data[0]) {
          stripeCustomer = await paymentProviders.stripe.customers.update(
            existingCustomers.data[0].id,
            {
              name: booking.guestName ?? undefined,
              phone: booking.guestMobile || customerInfo?.phone,
              metadata: {
                booking_id: bookingId,
                app_user_id: customerInfo?.userId || "guest",
                nationality:
                  booking.guestNationality || customerInfo?.nationality || "",
                last_updated: new Date().toISOString(),
                last_booking_amount: amount.toString(),
              },
            }
          );
        }
      } else {
        stripeCustomer = await paymentProviders.stripe.customers.create({
          name: booking.guestName ?? undefined,
          email: booking.guestEmail ?? undefined,
          phone: booking.guestMobile ?? customerInfo?.phone ?? undefined,
          metadata: {
            booking_id: bookingId,
            app_user_id: customerInfo?.userId || "guest",
            nationality:
              booking.guestNationality || customerInfo?.nationality || "",
            created_from: "royal_dusk_app",
            first_booking_date: new Date().toISOString(),
            first_booking_amount: amount.toString(),
          },
          address:
            booking.guestNationality || customerInfo?.nationality
              ? {
                  country: getCountryCodeFromNationality(
                    booking.guestNationality || customerInfo?.nationality
                  ),
                }
              : undefined,
        });
      }

      if (stripeCustomer) {
        stripeCustomerId = stripeCustomer.id;
      }
    } catch (customerError) {
      console.error("❌ Error handling Stripe customer:", customerError);
      // Continue without customer if creation fails, but log the error
      stripeCustomer = null;
    }

    const paymentIntentData = {
      amount,
      currency,
      ...(stripeCustomerId && { customer: stripeCustomerId }),
      receipt_email: booking.guestEmail ?? undefined,
      metadata: {
        booking_id: bookingId,
        guest_name: booking.guestName,
        guest_email: booking.guestEmail,
        guest_phone: booking.guestMobile || customerInfo?.phone || "",
        guest_nationality:
          booking.guestNationality || customerInfo?.nationality || "",
        app_user_id: customerInfo?.userId || "guest",
        payment_source: "royal_dusk_mobile_app",
        ...metadata,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    };

    console.log("🔄 Creating payment intent with data:", {
      customer: stripeCustomerId,
      amount,
      currency,
      hasMetadata: !!paymentIntentData.metadata,
    });

    // Create the payment intent
    const intent =
      await paymentProviders.stripe.paymentIntents.create(paymentIntentData);

    providerRefId = intent.id;
    clientSecret = intent.client_secret!;

    console.log("✅ Payment intent created:", {
      id: intent.id,
      customer: stripeCustomerId,
      amount: intent.amount,
      currency: intent.currency,
    });
  } else if (provider === "Razorpay") {
    // Handle Razorpay as before
    const order = await paymentProviders.razorpay.orders.create({
      amount,
      currency,
      receipt: bookingId,
    });
    providerRefId = order.id;
    clientSecret = order.id;
  }

  // Save payment record in your database
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

  // 🎯 Return enhanced response with customer information
  return res.json({
    clientSecret,
    customerId: stripeCustomerId,
    message: "Payment intent created successfully",
    ...(stripeCustomerId && {
      customerCreated: true,
      customerType: "real_customer", // Not guest!
    }),
  });
};

const getConfirmationPdf = async (req: Request, res: Response) => {
  const { bookingId } = req.params;

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
