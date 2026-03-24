import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __northstarPrisma: PrismaClient | undefined;
}

export const prisma = globalThis.__northstarPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__northstarPrisma = prisma;
}
