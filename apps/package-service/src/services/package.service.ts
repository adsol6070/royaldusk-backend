import { prisma, Prisma, Package } from "@repo/database";

type UpdatePackageInput = {
  packageId: string;
  data?: Prisma.PackageUpdateInput;

  featureIds?: string[];
  services?: {
    serviceId: string;
    type: "Inclusion" | "Exclusion";
  }[];
  timeline?: { day: number; entries: { itineraryId: string }[] }[];
};

export const PackageService = {
  createPackage: async (rawData: any): Promise<Package> => {
    const {
      featureIDs = [],
      timeline = [],
      inclusionIDs = [],
      exclusionIDs = [],
      categoryID,
      locationId,
      policyID,
      ...rest
    } = rawData;

    const data: Prisma.PackageCreateInput = {
      ...rest,
      category: { connect: { id: categoryID } },
      location: { connect: { id: locationId } },
      policy: { connect: { id: policyID } },

      features: {
        create: featureIDs.map((id: string) => ({
          feature: { connect: { id } },
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
    const newPackage = await prisma.package.create({ data });

    // Step 2: Handle the timeline entries
    if (timeline.length > 0) {
      const itineraryRelations = timeline.flatMap((dayBlock: any) =>
        dayBlock.entries.map((entry: any) => ({
          packageId: newPackage.id,
          itineraryId: entry.itineraryId,
          day: dayBlock.day,
        }))
      );

      await prisma.packageItineraryOnPackage.createMany({
        data: itineraryRelations,
      });
    }

    return newPackage;
  },

  getAllPackages: async (): Promise<any[]> => {
    const packages = await prisma.package.findMany({
      include: {
        category: true,
        location: true,
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
      policy: {
        id: pkg.policy?.id,
        bookingPolicy: pkg.policy?.bookingPolicy,
        cancellationPolicy: pkg.policy?.cancellationPolicy,
        paymentTerms: pkg.policy?.paymentTerms,
        visaDetail: pkg.policy?.visaDetail,
      },
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
        location: true,
        features: { include: { feature: true } },
        itineraries: {
          include: {
            itinerary: true,
          },
        },
        policy: true,
        services: { include: { service: true } },
      },
    });

    if (!pkg) return null;

    const timelineMap = new Map<number, any>();

    for (const itOnPkg of pkg.itineraries) {
      const day = itOnPkg.day;

      if (!timelineMap.has(day)) {
        timelineMap.set(day, { day, entries: [] });
      }

      timelineMap.get(day)!.entries.push({
        itineraryId: itOnPkg.itinerary.id,
        title: itOnPkg.itinerary.title,
        description: itOnPkg.itinerary.description,
      });
    }

    const timeline = Array.from(timelineMap.values()).sort(
      (a, b) => a.day - b.day
    );

    return {
      ...pkg,
      category: { id: pkg.category.id, name: pkg.category.name },
      policy: {
        id: pkg.policy?.id,
        bookingPolicy: pkg.policy?.bookingPolicy,
        cancellationPolicy: pkg.policy?.cancellationPolicy,
        paymentTerms: pkg.policy?.paymentTerms,
        visaDetail: pkg.policy?.visaDetail,
      },
      features: pkg.features.map((f) => ({
        id: f.feature.id,
        name: f.feature.name,
      })),
      timeline,
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
      include: {
        category: true,
        location: true,
        features: { include: { feature: true } },
        itineraries: { include: { itinerary: true } },
        services: { include: { service: true } },
        policy: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return packages.map((pkg) => ({
      ...pkg,
      category: pkg.category
        ? { id: pkg.category.id, name: pkg.category.name }
        : null,
      policy: pkg.policy
        ? {
            id: pkg.policy.id,
            bookingPolicy: pkg.policy.bookingPolicy,
            cancellationPolicy: pkg.policy.cancellationPolicy,
            paymentTerms: pkg.policy.paymentTerms,
            visaDetail: pkg.policy.visaDetail,
          }
        : null,
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

  updatePackage: async (input: UpdatePackageInput) => {
    const { packageId, data, featureIds, timeline, services } = input;

    const tx: Prisma.PrismaPromise<any>[] = [];

    if (data && Object.keys(data).length > 0) {
      tx.push(
        prisma.package.update({
          where: { id: packageId },
          data,
        })
      );
    }

    if (featureIds) {
      tx.push(
        prisma.packageFeatureOnPackage.deleteMany({ where: { packageId } })
      );

      if (featureIds.length > 0) {
        const featureData = featureIds.map((featureId) => ({
          packageId,
          featureId,
        }));
        tx.push(
          prisma.packageFeatureOnPackage.createMany({ data: featureData })
        );
      }
    }

    if (services) {
      tx.push(
        prisma.packageServiceOnPackage.deleteMany({ where: { packageId } })
      );

      if (services.length > 0) {
        const serviceData = services.map((service) => ({
          packageId,
          serviceId: service.serviceId,
          type: service.type,
        }));

        tx.push(
          prisma.packageServiceOnPackage.createMany({ data: serviceData })
        );
      }
    }

    if (timeline) {
      tx.push(
        prisma.packageItineraryOnPackage.deleteMany({ where: { packageId } })
      );

      const itineraryData = timeline.flatMap((dayItem) =>
        dayItem.entries.map((entry: any) => ({
          packageId,
          itineraryId: entry.itineraryId,
          day: dayItem.day,
        }))
      );

      if (itineraryData.length > 0) {
        tx.push(
          prisma.packageItineraryOnPackage.createMany({ data: itineraryData })
        );
      }
    }

    await prisma.$transaction(tx);
  },

  deletePackage: async (
    where: Prisma.PackageWhereUniqueInput
  ): Promise<Package> => {
    return await prisma.package.delete({ where });
  },

  updateAvailability: async (
    id: string,
    availability: "Available" | "SoldOut" | "ComingSoon"
  ): Promise<Package> => {
    return await prisma.package.update({
      where: { id },
      data: { availability },
    });
  },
};
