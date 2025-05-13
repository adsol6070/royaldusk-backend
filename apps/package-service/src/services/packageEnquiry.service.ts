import { prisma, Prisma, Enquiry } from "@repo/database";

export const PackageEnquiryService = {
  createEnquiry: async (data: Prisma.EnquiryCreateInput): Promise<Enquiry> => {
    const response = await prisma.enquiry.create({ data });
    console.log("response ", response)
    return response
  },

  getEnquiryByID: async (id: string): Promise<Enquiry | null> => {
    return await prisma.enquiry.findUnique({
      where: { id },
      include: {
        package: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
    });
  },

  getAllEnquiry: async (): Promise<Enquiry[]> => {
    return await prisma.enquiry.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        package: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
      },
    });
  },

  updateEnquiry: async (
    id: string,
    data: Prisma.PackageFeatureUpdateInput
  ): Promise<Enquiry> => {
    return await prisma.enquiry.update({
      where: { id },
      data,
    });
  },

  deleteEnquiry: async (id: string): Promise<Enquiry> => {
    return await prisma.enquiry.delete({
      where: { id },
    });
  },
};
