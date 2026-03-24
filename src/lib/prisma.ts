import { PrismaClient } from "@prisma/client";
import { assertProdSecurityEnv } from "./env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
assertProdSecurityEnv();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
