import { prisma, Booking, BookingStatus, BookingServiceType } from "@repo/database";

export const BookingService = {
  createBooking: async (data: {
    userId?: string | null;
    guestName?: string | null;
    guestEmail?: string | null;
    guestMobile?: string | null;
    guestNationality?: string | null;
    remarks?: string | null;
    agreedToTerms?: boolean;
    serviceType: BookingServiceType;
    serviceId: string;
    serviceData: any;
  }): Promise<Booking> => {
    return await prisma.booking.create({
      data: {
        ...(data.userId && { userId: data.userId }),
        guestName: data.guestName ?? null,
        guestEmail: data.guestEmail ?? null,
        guestMobile: data.guestMobile ?? null,
        guestNationality: data.guestNationality ?? null,
        remarks: data.remarks ?? null,
        agreedToTerms: data.agreedToTerms ?? false,
        serviceType: data.serviceType,
        serviceId: data.serviceId,
        serviceData: data.serviceData,
      },
    });
  },

  getAllBookings: async (): Promise<any[]> => {
    const bookings = await prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      include: { payments: true },
    });

    return bookings.map((booking) => {
      const succeededPayments = booking.payments.filter(
        (p) => p.status === "succeeded"
      );

      return {
        id: booking.id,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestMobile: booking.guestMobile,
        status: booking.status,
        serviceType: booking.serviceType,
        serviceId: booking.serviceId,
        createdAt: booking.createdAt,
        paymentStatus: booking.payments[0]?.status ?? "pending",
        totalAmountPaid: succeededPayments.reduce((sum, p) => sum + p.amount, 0),
        currency: succeededPayments[0]?.currency ?? null,
      };
    });
  },

  getBookingById: async (id: string): Promise<any | null> => {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!booking) return null;

    return {
      id: booking.id,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      guestMobile: booking.guestMobile,
      guestNationality: booking.guestNationality,
      remarks: booking.remarks,
      agreedToTerms: booking.agreedToTerms,
      status: booking.status,
      confirmationPdfPath: booking.confirmationPdfPath,
      serviceType: booking.serviceType,
      serviceId: booking.serviceId,
      serviceData: booking.serviceData,
      createdAt: booking.createdAt,
      payments: booking.payments.map((payment) => ({
        provider: payment.provider,
        providerRefId: payment.providerRefId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        receiptUrl: payment.receiptUrl,
        cardBrand: payment.cardBrand,
        cardLast4: payment.cardLast4,
        createdAt: payment.createdAt,
      })),
    };
  },

  getBookingsByEmail: async (email: string): Promise<any[]> => {
    const bookings = await prisma.booking.findMany({
      where: { guestEmail: email },
      orderBy: { createdAt: "desc" },
      include: { payments: true },
    });

    return bookings.map((booking) => {
      const succeededPayments = booking.payments.filter(
        (p) => p.status === "succeeded"
      );

      return {
        id: booking.id,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestMobile: booking.guestMobile,
        status: booking.status,
        serviceType: booking.serviceType,
        serviceId: booking.serviceId,
        createdAt: booking.createdAt,
        paymentStatus: booking.payments[0]?.status ?? "pending",
        totalAmountPaid: succeededPayments.reduce((sum, p) => sum + p.amount, 0),
        currency: succeededPayments[0]?.currency ?? null,
      };
    });
  },

  updateBookingStatus: async (
    bookingId: string,
    status: BookingStatus
  ): Promise<Booking | null> => {
    return await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
    });
  },

  deleteBooking: async (id: string): Promise<Booking | null> => {
    return await prisma.booking.delete({
      where: { id },
    });
  },
};
