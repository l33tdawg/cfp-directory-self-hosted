/**
 * Prisma Client Singleton
 * 
 * This module ensures a single Prisma client instance is used throughout
 * the application, preventing connection pool exhaustion in development.
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Only log errors and warnings (remove 'query' to reduce noise)
    // To enable query logging for debugging, add 'query' to the array
    log: process.env.NODE_ENV === 'development' 
      ? ['error', 'warn'] 
      : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
