import { prisma, Prisma, NewsletterSubscriber } from "@repo/database";

export const NewsletterService = {
  createSubscriber: async (input: Prisma.NewsletterSubscriberCreateInput) => {
    return (await prisma.newsletterSubscriber.create({
      data: input,
    })) as NewsletterSubscriber;
  },

  findByEmail: async (
    email: string,
    select?: Prisma.NewsletterSubscriberSelect
  ) => {
    return (await prisma.newsletterSubscriber.findUnique({
      where: { email },
      select,
    })) as NewsletterSubscriber;
  },

  updateStatusByEmail: async (email: string, isActive: boolean) => {
    const result = await prisma.newsletterSubscriber.updateMany({
      where: { email },
      data: { isActive },
    });

    return result.count > 0;
  },

  findById: async (
    id: string,
    select?: Prisma.NewsletterSubscriberSelect
  ) => {
    return (await prisma.newsletterSubscriber.findUnique({
      where: { id },
      select,
    })) as NewsletterSubscriber;
  },

  getAll: async (select?: Prisma.NewsletterSubscriberSelect) => {
    return await prisma.newsletterSubscriber.findMany({
      select,
      orderBy: { createdAt: "desc" },
    });
  },

  deleteById: async (id: string) => {
    try {
      return await prisma.newsletterSubscriber.delete({
        where: { id },
      });
    } catch {
      return null;
    }
  },
};
