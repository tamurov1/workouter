import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const createClient = () =>
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

export const prisma =
  process.env.NODE_ENV === "production"
    ? globalForPrisma.prisma ?? createClient()
    : createClient();

if (process.env.NODE_ENV !== "production") {
  // Keep dev client uncached to avoid stale Prisma metadata after schema changes.
  globalForPrisma.prisma = undefined;
}

if (process.env.NODE_ENV === "production" && !globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}
