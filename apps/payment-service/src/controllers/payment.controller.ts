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
