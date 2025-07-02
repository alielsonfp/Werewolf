// 🐺 LOBISOMEM ONLINE - Database Configuration
// PostgreSQL connection and Prisma setup

import { PrismaClient } from '@prisma/client';
import { config } from './environment';

// =============================================================================
// PRISMA CLIENT SINGLETON
// =============================================================================
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.IS_DEVELOPMENT ? ['query', 'info', 'warn', 'error'] : ['error'],
    datasources: {
      db: {
        url: config.DATABASE_URL,
      },
    },
  });

if (!config.IS_PRODUCTION) globalForPrisma.prisma = prisma;

// =============================================================================
// DATABASE CONNECTION HELPERS
// =============================================================================
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL connected successfully');

    // Test connection with a simple query
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log('🔍 Database health check:', result);
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('👋 PostgreSQL disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting from PostgreSQL:', error);
  }
}

// =============================================================================
// DATABASE HEALTH CHECK
// =============================================================================
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  message: string;
  timestamp: string;
}> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'healthy',
      message: 'PostgreSQL is responding',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown database error',
      timestamp: new Date().toISOString(),
    };
  }
}

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================
export async function gracefulShutdown(): Promise<void> {
  console.log('🛑 Shutting down database connections...');
  await disconnectDatabase();
}