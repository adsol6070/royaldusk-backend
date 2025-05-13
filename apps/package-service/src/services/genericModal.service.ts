import { prisma, Prisma, PackageCategory, PackageFeature, PackageService as ServiceModel } from "@repo/database";

// --- Generic Service Creator ---

interface GenericServiceOptions<TCreateInput, TUpdateInput, TModel> {
  model: any; 
  orderByField?: keyof TModel; 
  orderByDirection?: "asc" | "desc";
}

function createGenericService<TCreateInput, TUpdateInput, TModel>({
  model,
  orderByField,
  orderByDirection = "asc",
}: GenericServiceOptions<TCreateInput, TUpdateInput, TModel>) {
  return {
    create: async (data: TCreateInput): Promise<TModel> => {
      return await model.create({ data });
    },

    getById: async (id: string): Promise<TModel | null> => {
      return await model.findUnique({ where: { id } });
    },

    getAll: async (): Promise<TModel[]> => {
      return await model.findMany({
        orderBy: orderByField ? { [orderByField]: orderByDirection } : undefined,
      });
    },

    update: async (id: string, data: TUpdateInput): Promise<TModel> => {
      return await model.update({ where: { id }, data });
    },

    delete: async (id: string): Promise<TModel> => {
      return await model.delete({ where: { id } });
    },
  };
}

// --- Specific Services Using Generic Service ---

export const FeatureService = createGenericService<
  Prisma.PackageFeatureCreateInput,
  Prisma.PackageFeatureUpdateInput,
  PackageFeature
>({
  model: prisma.packageFeature,
  orderByField: "name", 
  orderByDirection: "asc",
});

export const CategoryService = createGenericService<
  Prisma.PackageCategoryCreateInput,
  Prisma.PackageCategoryUpdateInput,
  PackageCategory
>({
  model: prisma.packageCategory,
  orderByField: "name", 
  orderByDirection: "asc",
});

export const ServiceService = createGenericService<
  Prisma.PackageServiceCreateInput,
  Prisma.PackageServiceUpdateInput,
  ServiceModel
>({
  model: prisma.packageService,
  orderByField: "name", 
  orderByDirection: "asc",
});
