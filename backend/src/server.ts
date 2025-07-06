// 🐺 LOBISOMEM ONLINE - Server Entry Point (CORREÇÃO DEFINITIVA)
import http from 'http';
import app from './app';
import { config, validateConfig } from '@/config/environment';
import { connectDatabase, gracefulShutdown as shutdownDatabase } from '@/config/database';
import { connectRedis, gracefulShutdown as shutdownRedis } from '@/config/redis';
import { ServiceFactory } from './websocket/ServiceFactory';
import { WebSocketManager } from '@/websocket/WebSocketManager';
import { logger } from '@/utils/logger';

let server: http.Server;
let wsManager: WebSocketManager;

// Função de retry para conexão com o banco
const connectWithRetry = async (connectFn: () => Promise<void>, retries = 5, delay = 5000) => {
  for (let i = 1; i <= retries; i++) {
    try {
      await connectFn();
      logger.info('Database connected successfully.');
      return;
    } catch (error) {
      logger.error(`Database connection attempt ${i} failed. Retrying in ${delay / 1000}s...`, { error });
      if (i === retries) {
        throw new Error(`Could not connect to the database after ${retries} attempts.`);
      }
      await new Promise(res => setTimeout(res, delay));
    }
  }
};

async function startServer(): Promise<void> {
  try {
    validateConfig();

    // Conectar banco (obrigatório) com retry
    await connectWithRetry(connectDatabase);

    // Conectar Redis (opcional - não falha se der erro)
    if (config.SHOULD_USE_REDIS) {
      try {
        await connectRedis();
      } catch (error) {
        logger.warn('Redis connection failed, continuing without Redis', { error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    const gameStateService = ServiceFactory.getGameStateService();
    const eventBus = ServiceFactory.getEventBus();

    server = http.createServer(app);

    if (config.IS_MONOLITH || config.IS_GAME_SERVICE) {
      wsManager = new WebSocketManager(gameStateService, eventBus, config);
      wsManager.setupWebSocketServer(server);
    }

    server.listen(config.PORT, () => {
      logger.info(`Server running at http://localhost:${config.PORT}`);
    });

    setupGracefulShutdown(server);

  } catch (error) {
    logger.error('Failed to start server', error instanceof Error ? error : new Error('Unknown server start error'));
    process.exit(1);
  }
}

function setupGracefulShutdown(server: http.Server): void {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
      logger.info('HTTP server closed.');
      if (wsManager) await wsManager.shutdown();
      await shutdownDatabase();
      if (config.SHOULD_USE_REDIS) {
        try {
          await shutdownRedis();
        } catch (error) {
          logger.warn('Error shutting down Redis', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
      ServiceFactory.clearInstances();
      logger.info('Graceful shutdown completed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (require.main === module) {
  startServer();
}

export default app;