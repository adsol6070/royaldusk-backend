import { prisma, Prisma, Tour } from "@repo/database";

export const TourService = {
  /**
   * Create a tour with dynamic category and location relations
   */
  createTour: async (rawData: any): Promise<Tour> => {
    const { categoryID, locationId, price, tag = "Regular", ...rest } = rawData;

    const data: Prisma.TourCreateInput = {
      ...rest,
      price: new Prisma.Decimal(price),
      tag,
      category: { connect: { id: categoryID } },
      location: { connect: { id: locationId } },
    };

    return await prisma.tour.create({
      data,
      include: {
        category: true,
        location: true,
      },
    });
  },

  /**
   * Get all tours with category and location relations
   */
  getAllTours: async (): Promise<Tour[]> => {
    return await prisma.tour.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        location: true,
      },
    });
  },

  /**
   * Get a single tour by ID with its relations
   */
  getTourByID: async (where: Prisma.TourWhereUniqueInput): Promise<Tour | null> => {
    return await prisma.tour.findUnique({
      where,
      include: {
        category: true,
        location: true,
      },
    });
  },

  /**
   * Update a tour by ID with possible relational updates
   */
  updateTour: async (id: string, data: Prisma.TourUpdateInput): Promise<Tour> => {
    return await prisma.tour.update({
      where: { id },
      data,
      include: {
        category: true,
        location: true,
      },
    });
  },

  /**
   * Update tour availability status
   */
  updateAvailability: async (
    id: string,
    availability: "Available" | "SoldOut" | "ComingSoon"
  ): Promise<Tour> => {
    return await prisma.tour.update({
      where: { id },
      data: { tourAvailability: availability },
    });
  },

  /**
   * Delete a tour and return the deleted object with relations
   */
  deleteTour: async (where: Prisma.TourWhereUniqueInput): Promise<Tour> => {
    return await prisma.tour.delete({
      where,
      include: {
        category: true,
        location: true,
      },
    });
  },
};
