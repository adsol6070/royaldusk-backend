import {
  prisma,
  Prisma,
  Booking,
  BookingItem,
  BookingStatus,
} from "@repo/database";

export const BookingService = {
  createBooking: async (data: {
    userId?: string | null;
    guestName?: string | null;
    guestEmail?: string | null;
    guestMobile?: string | null;
    guestNationality?: string | null;
    remarks?: string | null;
    agreedToTerms?: boolean;
    items: {
      packageId: string;
      travelers: number;
      startDate: Date;
    }[];
  }): Promise<Booking> => {
    const booking = await prisma.booking.create({
      data: {
        ...(data.userId && { user: { connect: { id: data.userId } } }),
        guestName: data.guestName ?? null,
        guestEmail: data.guestEmail ?? null,
        guestMobile: data.guestMobile ?? null,
        guestNationality: data.guestNationality ?? null,
        remarks: data.remarks ?? null,
        agreedToTerms: data.agreedToTerms ?? false,
        items: {
          create: data.items.map((item) => ({
            package: { connect: { id: item.packageId } },
            travelers: item.travelers,
            startDate: item.startDate,
          })),
        },
      },
      include: { items: true },
    });

    return booking;
  },
  getAllBookings: async (): Promise<any[]> => {
    const bookings = await prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            package: {
              select: { name: true },
            },
          },
        },
        payments: true,
      },
    });

    return bookings.map((booking) => {
      const firstItem = booking.items[0];
      const succeededPayments = booking.payments.filter(
        (p) => p.status === "succeeded"
      );

      return {
        id: booking.id,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        status: booking.status,
        createdAt: booking.createdAt,
        packageName: firstItem?.package?.name ?? null,
        travelDate: firstItem?.startDate ?? null,
        travelers: firstItem?.travelers ?? 0,
        paymentStatus: booking.payments[0]?.status ?? "pending",
        totalAmountPaid: succeededPayments.reduce(
          (sum, p) => sum + p.amount,
          0
        ),
        currency: succeededPayments[0]?.currency ?? null,
      };
    });
  },
  getBookingById: async (id: string): Promise<any | null> => {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            package: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        payments: true,
      },
    });

    if (!booking) return null;

    const transformed = {
      id: booking.id,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      guestMobile: booking.guestMobile,
      guestNationality: booking.guestNationality,
      remarks: booking.remarks,
      agreedToTerms: booking.agreedToTerms,
      status: booking.status,
      createdAt: booking.createdAt,
      items: booking.items.map((item) => ({
        id: item.id,
        packageId: item.package.id,
        packageName: item.package.name,
        travelers: item.travelers,
        startDate: item.startDate,
      })),
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

    return transformed;
  },
  updateBookingItem: async (
    id: string,
    data: Partial<Prisma.BookingItemUpdateInput>
  ): Promise<BookingItem | null> => {
    return await prisma.bookingItem.update({
      where: { id },
      data,
    });
  },
  updateBookingStatus: async (
    bookingId: string | undefined,
    status: BookingStatus
  ): Promise<Booking | null> => {
    return await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
      include: { items: true },
    });
  },
  deleteBookingItem: async (id: string): Promise<BookingItem | null> => {
    return await prisma.bookingItem.delete({
      where: { id },
    });
  },
  deleteBooking: async (id: string): Promise<Booking | null> => {
    return await prisma.booking.delete({
      where: { id },
    });
  },
};
