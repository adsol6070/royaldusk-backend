// services/location.service.ts
import { prisma, Prisma, Location } from "@repo/database";

type CreateLocationInput = Prisma.LocationCreateInput;
type UpdateLocationInput = Prisma.LocationUpdateInput;
type LocationWhereUniqueInput = Prisma.LocationWhereUniqueInput;
type LocationWhereInput = Prisma.LocationWhereInput;

export const LocationService = {
  createLocation: async (data: CreateLocationInput): Promise<Location> => {
    return await prisma.location.create({ data });
  },

  getAllLocations: async (): Promise<Location[]> => {
    return await prisma.location.findMany({ orderBy: { name: "asc" } });
  },

  getLocationByID: async (
    where: LocationWhereUniqueInput
  ): Promise<Location | null> => {
    return await prisma.location.findUnique({ where });
  },

  getLocations: async (filters: LocationWhereInput = {}): Promise<Location[]> => {
    return await prisma.location.findMany({ where: filters, orderBy: { name: "asc" } });
  },

  updateLocation: async (
    id: string,
    data: UpdateLocationInput
  ): Promise<Location> => {
    return await prisma.location.update({ where: { id }, data });
  },

  deleteLocation: async (id: string): Promise<Location> => {
    return await prisma.location.delete({ where: { id } });
  },
};
