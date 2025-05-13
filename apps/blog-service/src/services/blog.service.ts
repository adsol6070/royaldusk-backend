import { prisma, Prisma, Blog } from "@repo/database";

export const BlogService = {
  createBlog: async (data: Prisma.BlogCreateInput) => {
    return (await prisma.blog.create({ data })) as Blog;
  },

  getAllBlogs: async () => {
    return await prisma.blog.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },

  getBlogByID: async (where: Prisma.BlogWhereUniqueInput) => {
    return await prisma.blog.findUnique({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },

  getBlogs: async (filters: Prisma.BlogWhereInput = {}): Promise<Blog[]> => {
    return await prisma.blog.findMany({
      where: filters,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        category: true,
      },
    });
  },

  updateBlog: async (id: string, data: Prisma.BlogUpdateInput) => {
    return await prisma.blog.update({
      where: { id },
      data,
    });
  },

  deleteBlog: async (where: Prisma.BlogWhereUniqueInput) => {
    return await prisma.blog.delete({
      where,
    });
  },

  updateStatus: async (
    id: string,
    status: "draft" | "published" | "archived"
  ) => {
    return await prisma.blog.update({
      where: { id },
      data: { status },
    });
  },
};
