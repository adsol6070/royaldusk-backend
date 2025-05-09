import { prisma, Prisma, Blog } from "@repo/database";
import axios from "axios";

const USER_SERVICE_URL = "http://localhost:4000/users/";

export const BlogService = {
  createBlog: async (data: Prisma.BlogCreateInput) => {
    return (await prisma.blog.create({ data })) as Blog;
  },

  getAllBlogs: async () => {
    return await prisma.blog.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  getBlogByID: async (where: Prisma.BlogWhereUniqueInput) => {
    return await prisma.blog.findUnique({
      where,
    });
  },

  getBlogs: async (filters: Prisma.BlogWhereInput = {}): Promise<Blog[]> => {
    const blogs = await prisma.blog.findMany({
      where: filters,
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
      },
    });

    const blogsWithAuthors = await Promise.all(
      blogs.map(async (blog) => {
        const author = await axios.get(`${USER_SERVICE_URL}${blog.authorID}`);
        return {
          ...blog,
          author: author.data,
        };
      })
    );

    return blogsWithAuthors;
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
