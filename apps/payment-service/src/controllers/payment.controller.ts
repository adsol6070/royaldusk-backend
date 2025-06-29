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
      cartItems: cartItemsJson,
      totalAmount,
      remarks,
      paymentMethod,
    } = metadata;

    if (!guestEmail || !cartItemsJson) {
      return res.status(400).json({
        error: "Missing guest email or cart items in metadata",
      });
    }

    let cartItems;
    try {
      cartItems = JSON.parse(cartItemsJson);

      if (!Array.isArray(cartItems) || cartItems.length === 0) {
        throw new Error("Cart items must be a non-empty array");
      }
    } catch (parseError) {
      console.error("❌ Cart items parsing failed:", parseError);
      return res.status(400).json({
        error: "Invalid cart items format",
        details:
          parseError instanceof Error ? parseError.message : "Unknown error",
      });
    }

    // Handle Stripe customer creation/retrieval
    let stripeCustomer = null;
    try {
      const existingCustomers = await paymentProviders.stripe.customers.list({
        email: guestEmail,
        limit: 1,
      });

      if (existingCustomers.data.length > 0 && existingCustomers.data[0]) {
        stripeCustomer = existingCustomers.data[0];
        console.log("📍 Using existing customer:", stripeCustomer.id);

        // Optionally update customer info
        await paymentProviders.stripe.customers.update(stripeCustomer.id, {
          name: guestName,
          phone: guestMobile,
          metadata: {
            nationality: guestNationality || "",
            last_updated: new Date().toISOString(),
            created_from: "royal_dusk_checkout",
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
            created_from: "royal_dusk_checkout",
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

    // Prepare line items from cart data
    console.log("📦 Preparing line items...");

    const lineItems = cartItems.map((item: any, index: number) => {
      const itemPrice = parseFloat(item.price) || 0;
      const unitAmountInFils = Math.round(itemPrice * 100);

      console.log(`📦 Item ${index + 1}:`, {
        packageName: item.packageName,
        price: itemPrice,
        unitAmountInFils,
        travelers: item.travelers,
      });

      return {
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: item.packageName || `Package #${item.packageId}`,
            description: `${item.travelers || 1} travelers - Start: ${new Date(
              item.startDate
            ).toLocaleDateString()}`,
            metadata: {
              package_id: item.packageId.toString(),
              travelers: (item.travelers || 1).toString(),
              start_date: item.startDate,
            },
          },
          unit_amount: unitAmountInFils,
        },
        quantity: 1,
      };
    });

    // Verify total amount matches
    const calculatedTotal = lineItems.reduce(
      (sum, item) => sum + item.price_data.unit_amount,
      0
    );
    console.log("💰 Amount verification:", {
      requestAmount: amount,
      calculatedTotal,
      matches: amount === calculatedTotal,
    });

    if (amount !== calculatedTotal) {
      console.warn("⚠️ Amount mismatch detected but continuing...");
    }

    // 🔧 FIX: Prepare cart items for metadata storage
    // Compress cart items to fit in Stripe metadata (500 char limit per field)
    const compressedCartItems = cartItems.map((item: any) => ({
      pid: item.packageId, // packageId -> pid
      pn: item.packageName, // packageName -> pn
      t: item.travelers, // travelers -> t
      sd: item.startDate, // startDate -> sd
      p: item.price, // price -> p
    }));

    const cartItemsString = JSON.stringify(compressedCartItems);
    console.log("📦 Cart items string length:", cartItemsString.length);

    // Create checkout session
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
        total_amount: amount.toString(),
        currency: currency.toUpperCase(),
        booking_source: "royal_dusk_web",
        remarks: remarks || "",
        payment_method: paymentMethod || "Credit Card",
        // 🔧 FIX: Store actual cart items data (not just summary)
        cart_items: cartItemsString, // Store compressed cart items
        cart_count: cartItems.length.toString(),
      },
      billing_address_collection: "required",
      phone_number_collection: {
        enabled: true,
      },
    };

    // Add customer information to session
    if (stripeCustomer?.id) {
      sessionData.customer = stripeCustomer.id;
      console.log("🔗 Using customer ID:", stripeCustomer.id);
    } else if (guestEmail) {
      sessionData.customer_email = guestEmail;
      console.log("📧 Using customer_email:", guestEmail);
    }

    console.log("🔄 Creating Stripe session with data:", {
      hasCustomer: !!sessionData.customer,
      hasCustomerEmail: !!sessionData.customer_email,
      amount,
      currency,
      lineItemsCount: lineItems.length,
      metadataKeys: Object.keys(sessionData.metadata || {}),
      cartItemsInMetadata: !!sessionData.metadata?.cart_items,
      cartItemsSize: cartItemsString.length,
    });

    // Create the Stripe checkout session
    const session =
      await paymentProviders.stripe.checkout.sessions.create(sessionData);

    console.log("✅ Checkout session created successfully:", {
      sessionId: session.id,
      sessionUrl: session.url,
      customer: stripeCustomer?.id,
      amount,
      currency,
    });

    return res.json({
      sessionId: session.id,
      sessionUrl: session.url,
      customerId: stripeCustomer?.id,
      message: "Checkout session created successfully",
    });
  } catch (error) {
    console.error("❌ Checkout session creation failed:", error);

    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        ...((error as any).type && { stripeErrorType: (error as any).type }),
        ...((error as any).code && { stripeErrorCode: (error as any).code }),
      });
    }

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
