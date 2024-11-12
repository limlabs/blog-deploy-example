import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const getPrismaClient = () => {
  return new PrismaClient().$extends(withAccelerate());
}

type WrappedPrismaClient = ReturnType<typeof getPrismaClient>;

// This avoid starting Prisma at import time during static generation
export const prisma: WrappedPrismaClient = (
  process.env.DATABASE_URL
    ? getPrismaClient()
    : null) as WrappedPrismaClient;
