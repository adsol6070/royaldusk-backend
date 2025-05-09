import { prisma, Prisma, Category } from "@repo/database";

export const BlogCategoryService = {
  createCategory: async (
    data: Prisma.CategoryCreateInput
  ): Promise<Category> => {
    return await prisma.category.create({ data });
  },

  getCategoryByID: async (id: string): Promise<Category | null> => {
    return await prisma.category.findUnique({
      where: { id },
    });
  },

  getAllCategories: async (): Promise<Category[]> => {
    return await prisma.category.findMany({
      orderBy: { name: "desc" },
    });
  },

  updateCategory: async (
    id: string,
    data: Prisma.CategoryUpdateInput
  ): Promise<Category> => {
    return await prisma.category.update({
      where: { id },
      data,
    });
  },

  deleteCategory: async (id: string): Promise<Category> => {
    return await prisma.category.delete({
      where: { id },
    });
  },
};
