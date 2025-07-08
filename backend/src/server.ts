// 🐺 LOBISOMEM ONLINE - Server Entry Point (SIMPLIFICADO)
import httpServer from './app';
import { config, validateConfig } from '@/config/environment';
import { connectDatabase, gracefulShutdown as shutdownDatabase } from '@/config/database';
import { connectRedis, gracefulShutdown as shutdownRedis } from '@/config/redis';
import { ServiceFactory } from './websocket/ServiceFactory';
import { WebSocketManager } from './websocket/WebSocketManager';
import { logger } from '@/utils/logger';

// Função de retry para conexão com o banco
const connectWithRetry = async (connectFn: () => Promise<void>, retries = 5, delay = 5000) => {
  for (let i = 1; i <= retries; i++) {
    try {
      await connectFn();
      logger.info('Database connected successfully.');
      return;
    } catch (error) {
      logger.error(`Database connection attempt ${i} failed. Retrying in ${delay / 1000}s...`, error as Error);
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
    // A criação do servidor e do WebSocketManager já aconteceu em app.ts
    // Agora só precisamos iniciar o servidor HTTP
    httpServer.listen(config.PORT, () => {
      logger.info(`🚀 Server running at http://localhost:${config.PORT}`);
      logger.info(`🐺 Werewolf Online ${config.SERVICE_TYPE} service started`);
      logger.info(`🔗 WebSocket available at ws://localhost:${config.PORT}${config.WS_BASE_PATH}`);
    });

    setupGracefulShutdown(httpServer);

  } catch (error) {
    logger.error('Failed to start server', error instanceof Error ? error : new Error('Unknown server start error'));
    process.exit(1);
  }
}

function setupGracefulShutdown(server: any): void {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    server.close(async () => {
      logger.info('HTTP server closed.');

      // Shutdown do WebSocketManager (se existir)
      if (server.wsManager) {
        try {
          await server.wsManager.shutdown();
          logger.info('WebSocket manager shut down.');
        } catch (error) {
          logger.warn('Error shutting down WebSocket manager', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      // Shutdown do banco
      await shutdownDatabase();

      // Shutdown do Redis (se configurado)
      if (config.SHOULD_USE_REDIS) {
        try {
          await shutdownRedis();
        } catch (error) {
          logger.warn('Error shutting down Redis', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      // Limpar instâncias do ServiceFactory
      ServiceFactory.clearInstances();

      logger.info('Graceful shutdown completed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Iniciar servidor se for executado diretamente
if (require.main === module) {
  startServer();
}

export default httpServer;