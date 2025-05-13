import { prisma, Prisma, PackagePolicy } from "@repo/database";

export const PackagePolicyService = {
  createPolicy: async (
    data: Prisma.PackagePolicyCreateInput
  ): Promise<PackagePolicy> => {
    return await prisma.packagePolicy.create({ data });
  },

  getPolicyByID: async (id: string): Promise<PackagePolicy | null> => {
    return await prisma.packagePolicy.findUnique({
      where: { id },
    });
  },

  getAllPolicy: async (): Promise<PackagePolicy[]> => {
    return await prisma.packagePolicy.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  updatePolicy: async (
    id: string,
    data: Prisma.PackageFeatureUpdateInput
  ): Promise<PackagePolicy> => {
    return await prisma.packagePolicy.update({
      where: { id },
      data,
    });
  },

  deletePolicy: async (id: string): Promise<PackagePolicy> => {
    return await prisma.packagePolicy.delete({
      where: { id },
    });
  },
};
