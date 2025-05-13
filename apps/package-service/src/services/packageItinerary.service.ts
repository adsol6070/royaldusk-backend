import { prisma, Prisma, PackageItinerary } from "@repo/database";

export const PackageItineraryService = {
  createItinerary: async (
    data: Prisma.PackageItineraryCreateInput
  ): Promise<PackageItinerary> => {
    return await prisma.packageItinerary.create({ data });
  },

  getItineraryByID: async (id: string): Promise<PackageItinerary | null> => {
    return await prisma.packageItinerary.findUnique({
      where: { id },
    });
  },

  getAllItinerary: async (): Promise<PackageItinerary[]> => {
    return await prisma.packageItinerary.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  updateItinerary: async (
    id: string,
    data: Prisma.PackageFeatureUpdateInput
  ): Promise<PackageItinerary> => {
    return await prisma.packageItinerary.update({
      where: { id },
      data,
    });
  },

  deleteItinerary: async (id: string): Promise<PackageItinerary> => {
    return await prisma.packageItinerary.delete({
      where: { id },
    });
  },
};
