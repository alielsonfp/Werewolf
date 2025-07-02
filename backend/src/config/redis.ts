// 🐺 LOBISOMEM ONLINE - Redis Configuration
// Cache, session store, and inter-service communication

import Redis from 'ioredis';
import { config } from './environment';

// =============================================================================
// REDIS CLIENT SINGLETON
// =============================================================================
let redisClient: Redis | null = null;
let redisSubscriber: Redis | null = null;
let redisPublisher: Redis | null = null;

// =============================================================================
// REDIS CLIENT FACTORY
// =============================================================================
export function createRedisClient(): Redis {
  return new Redis(config.REDIS_URL, {
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    family: 4, // IPv4
    connectTimeout: 10000,
    commandTimeout: 5000,

    // Connection pool
    maxLoadingTimeout: 5000,

    // Error handling
    showFriendlyErrorStack: config.IS_DEVELOPMENT,
  });
}

// =============================================================================
// MAIN REDIS CLIENT
// =============================================================================
export function getRedisClient(): Redis {
  if (!redisClient) {
    if (!config.SHOULD_USE_REDIS) {
      throw new Error('❌ Redis is not enabled in current configuration');
    }

    redisClient = createRedisClient();

    redisClient.on('connect', () => {
      console.log('🔗 Redis client connecting...');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis client ready');
    });

    redisClient.on('error', (error) => {
      console.error('❌ Redis client error:', error);
    });

    redisClient.on('close', () => {
      console.log('🔌 Redis client disconnected');
    });
  }

  return redisClient;
}

// =============================================================================
// PUB/SUB CLIENTS (PHASE 2)
// =============================================================================
export function getRedisSubscriber(): Redis {
  if (!redisSubscriber) {
    if (!config.SHOULD_USE_REDIS) {
      throw new Error('❌ Redis Pub/Sub is not enabled in current configuration');
    }

    redisSubscriber = createRedisClient();

    redisSubscriber.on('connect', () => {
      console.log('🔗 Redis subscriber connecting...');
    });

    redisSubscriber.on('ready', () => {
      console.log('✅ Redis subscriber ready');
    });

    redisSubscriber.on('error', (error) => {
      console.error('❌ Redis subscriber error:', error);
    });
  }

  return redisSubscriber;
}

export function getRedisPublisher(): Redis {
  if (!redisPublisher) {
    if (!config.SHOULD_USE_REDIS) {
      throw new Error('❌ Redis Pub/Sub is not enabled in current configuration');
    }

    redisPublisher = createRedisClient();

    redisPublisher.on('connect', () => {
      console.log('🔗 Redis publisher connecting...');
    });

    redisPublisher.on('ready', () => {
      console.log('✅ Redis publisher ready');
    });

    redisPublisher.on('error', (error) => {
      console.error('❌ Redis publisher error:', error);
    });
  }

  return redisPublisher;
}

// =============================================================================
// CONNECTION MANAGEMENT
// =============================================================================
export async function connectRedis(): Promise<void> {
  if (!config.SHOULD_USE_REDIS) {
    console.log('⏭️  Redis disabled in current configuration');
    return;
  }

  try {
    const client = getRedisClient();
    await client.connect();

    // Test connection
    const pong = await client.ping();
    if (pong === 'PONG') {
      console.log('✅ Redis connected successfully');
    }
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    throw error;
  }
}

export async function disconnectRedis(): Promise<void> {
  const promises: Promise<void>[] = [];

  if (redisClient) {
    promises.push(redisClient.disconnect());
  }

  if (redisSubscriber) {
    promises.push(redisSubscriber.disconnect());
  }

  if (redisPublisher) {
    promises.push(redisPublisher.disconnect());
  }

  try {
    await Promise.all(promises);
    console.log('👋 Redis clients disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting Redis clients:', error);
  }

  redisClient = null;
  redisSubscriber = null;
  redisPublisher = null;
}

// =============================================================================
// HEALTH CHECK
// =============================================================================
export async function checkRedisHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  message: string;
  timestamp: string;
}> {
  if (!config.SHOULD_USE_REDIS) {
    return {
      status: 'healthy',
      message: 'Redis disabled in configuration',
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const client = getRedisClient();
    const pong = await client.ping();

    return {
      status: pong === 'PONG' ? 'healthy' : 'unhealthy',
      message: pong === 'PONG' ? 'Redis is responding' : 'Redis ping failed',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Unknown Redis error',
      timestamp: new Date().toISOString(),
    };
  }
}

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================
export async function gracefulShutdown(): Promise<void> {
  console.log('🛑 Shutting down Redis connections...');
  await disconnectRedis();
}