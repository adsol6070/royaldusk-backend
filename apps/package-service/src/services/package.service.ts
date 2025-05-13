import { prisma, Prisma, Package } from "@repo/database";
import axios from "axios";

const USER_SERVICE_URL = "http://localhost:4000/users/";

export const PackageService = {
  createPackage: async (rawData: any): Promise<Package> => {
    console.log("Creating package with data:", rawData);

    const {
      featureIDs = [],
      itineraryIDs = [],
      inclusionIDs = [],
      exclusionIDs = [],
      categoryID,
      policyID,
      ...rest
    } = rawData;

    const data: Prisma.PackageCreateInput = {
      ...rest,
      category: { connect: { id: categoryID } },
      policy: { connect: { id: policyID } },

      features: {
        create: featureIDs.map((id: string) => ({
          feature: { connect: { id } },
        })),
      },
      itineraries: {
        create: itineraryIDs.map((id: string) => ({
          itinerary: { connect: { id } },
        })),
      },
      services: {
        create: [
          ...inclusionIDs.map((serviceID: string) => ({
            service: { connect: { id: serviceID } },
            type: "Inclusion",
          })),
          ...exclusionIDs.map((serviceID: string) => ({
            service: { connect: { id: serviceID } },
            type: "Exclusion",
          })),
        ],
      },
    };

    return await prisma.package.create({ data });
  },

  getAllPackages: async (): Promise<any[]> => {
    const packages = await prisma.package.findMany({
      include: {
        category: true,
        features: { include: { feature: true } },
        itineraries: { include: { itinerary: true } },
        services: { include: { service: true } },
        policy: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return packages.map((pkg) => ({
      ...pkg,
      category: { id: pkg.category.id, name: pkg.category.name },
      policy: { id: pkg.policy?.id, bookingPolicy: pkg.policy?.bookingPolicy, cancellationPolicy: pkg.policy?.cancellationPolicy, paymentTerms: pkg.policy?.paymentTerms, visaDetail: pkg.policy?.visaDetail  },
      features: pkg.features.map((f) => ({
        id: f.feature.id,
        name: f.feature.name,
      })),
      itineraries: pkg.itineraries.map((it) => ({
        id: it.itinerary.id,
        title: it.itinerary.title,
        description: it.itinerary.description,
      })),
      inclusions: pkg.services
        .filter((s) => s.type === "Inclusion")
        .map((s) => ({
          id: s.service.id,
          name: s.service.name,
        })),
      exclusions: pkg.services
        .filter((s) => s.type === "Exclusion")
        .map((s) => ({
          id: s.service.id,
          name: s.service.name,
        })),
      services: undefined,
    }));
  },

  getPackageByID: async (
    where: Prisma.PackageWhereUniqueInput
  ): Promise<any | null> => {
    const pkg = await prisma.package.findUnique({
      where,
      include: {
        category: true,
        features: { include: { feature: true } },
        itineraries: { include: { itinerary: true } },
        services: { include: { service: true } },
        policy: true,
      },
    });

    if (!pkg) return null;

    return {
      ...pkg,
      category: { id: pkg.category.id, name: pkg.category.name },
      policy: { id: pkg.policy?.id, bookingPolicy: pkg.policy?.bookingPolicy, cancellationPolicy: pkg.policy?.cancellationPolicy, paymentTerms: pkg.policy?.paymentTerms, visaDetail: pkg.policy?.visaDetail  },
      features: pkg.features.map((f) => ({
        id: f.feature.id,
        name: f.feature.name,
      })),
      itineraries: pkg.itineraries.map((it) => ({
        id: it.itinerary.id,
        title: it.itinerary.title,
        description: it.itinerary.description,
      })),
      inclusions: pkg.services
        .filter((s) => s.type === "Inclusion")
        .map((s) => ({
          id: s.service.id,
          name: s.service.name,
        })),
      exclusions: pkg.services
        .filter((s) => s.type === "Exclusion")
        .map((s) => ({
          id: s.service.id,
          name: s.service.name,
        })),
      services: undefined,
    };
  },

  getPackages: async (
    filters: Prisma.PackageWhereInput = {}
  ): Promise<any[]> => {
    const packages = await prisma.package.findMany({
      where: filters,
      orderBy: { createdAt: "desc" },
    });

    const packagesWithCreators = await Promise.all(
      packages.map(async (pkg) => {
        const creator = await axios.get(`${USER_SERVICE_URL}${pkg.createdAt}`);
        return {
          ...pkg,
          creator: creator.data,
        };
      })
    );

    return packagesWithCreators;
  },

 updatePackage: async (id: string, data: any): Promise<Package> => {
  const {
    featureIDs = [], 
    inclusionIDs = [], 
    exclusionIDs = [], 
    itineraryIDs = [], 
    ...rest
  } = data;

  const updatedPackage = await prisma.package.update({
    where: { id }, 
    data: {
      ...rest,

      features: {
        deleteMany: {
          featureId: {
            notIn: featureIDs, 
          },
        },
        connectOrCreate: featureIDs.map((featureId: string) => ({
          where: {
            packageId_featureId: { packageId: id, featureId }, 
          },
          create: {
            packageId: id,
            featureId,
          },
        })),
      },

      itineraries: {
        deleteMany: {
          itineraryId: {
            notIn: itineraryIDs, 
          },
        },
        connectOrCreate: itineraryIDs.map((itineraryId: string) => ({
          where: {
            packageId_itineraryId: { packageId: id, itineraryId },
          },
          create: {
            packageId: id,
            itineraryId,
          },
        })),
      },

      services: {
        deleteMany: {
          serviceId: {
            notIn: [...inclusionIDs, ...exclusionIDs], 
          },
        },
        connectOrCreate: [
          ...inclusionIDs.map((serviceId: string) => ({
            where: {
              packageId_serviceId: { packageId: id, serviceId }, 
            },
            create: {
              packageId: id,
              serviceId,
              type: "Inclusion",
            },
          })),
          ...exclusionIDs.map((serviceId: string) => ({
            where: {
              packageId_serviceId: { packageId: id, serviceId }, 
            },
            create: {
              packageId: id,
              serviceId,
              type: "Exclusion",
            },
          })),
        ],
      },
    },
  });

  return updatedPackage;
},

  deletePackage: async (
    where: Prisma.PackageWhereUniqueInput
  ): Promise<Package> => {
    return await prisma.package.delete({ where });
  },

  updateStatus: async (
    id: string,
    status: "Available" | "SoldOut" | "ComingSoon"
  ): Promise<Package> => {
    return await prisma.package.update({
      where: { id },
      data: { availability: status },
    });
  },
};
