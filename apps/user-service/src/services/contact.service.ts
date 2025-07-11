import { prisma, Prisma, ContactMessage } from "@repo/database";

export const ContactService = {
  create: async (input: Prisma.ContactMessageCreateInput) => {
    return (await prisma.contactMessage.create({ data: input })) as ContactMessage;
  },

  getAll: async (select?: Prisma.ContactMessageSelect) => {
    return await prisma.contactMessage.findMany({ select, orderBy: { createdAt: "desc" } });
  },

  getById: async (id: string, select?: Prisma.ContactMessageSelect) => {
    return (await prisma.contactMessage.findUnique({ where: { id }, select })) as ContactMessage;
  },

  deleteById: async (id: string) => {
    try {
      return await prisma.contactMessage.delete({ where: { id } });
    } catch {
      return null;
    }
  },
};