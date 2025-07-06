import { Pool } from 'pg';
import { config } from './environment';

const logger = {
  info: (message: string, data?: any) => console.log(`[INFO] ${message}`, data || ''),
  error: (message: string, error?: any) => console.error(`[ERROR] ${message}`, error || ''),
};

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export async function connectDatabase(): Promise<void> {
  try {
    const client = await pool.connect();
    logger.info('PostgreSQL connected successfully');

    const result = await client.query('SELECT NOW() as connected_at');
    logger.info('Database health check:', result.rows[0]);

    client.release();
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await pool.end();
    logger.info('PostgreSQL connections closed');
  } catch (error) {
    logger.error('Error disconnecting from PostgreSQL', error);
  }
}

export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  message: string;
  timestamp: string;
}> {
  try {
    await pool.query('SELECT 1');
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

export async function gracefulShutdown(): Promise<void> {
  logger.info('Shutting down database connections...');
  await disconnectDatabase();
}