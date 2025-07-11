// 🐺 LOBISOMEM ONLINE - Server Entry Point (COM LIMPEZA DE SALAS)
import httpServer from './app'; // ✅ Importar o httpServer já configurado
import { config, validateConfig } from '@/config/environment';
import { connectDatabase, gracefulShutdown as shutdownDatabase } from '@/config/database';
import { connectRedis, gracefulShutdown as shutdownRedis } from '@/config/redis';
import { ServiceFactory } from './websocket/ServiceFactory';
import { RoomCleanupService } from './services/RoomCleanupService'; // ✅ NOVO SERVIÇO
import { logger } from '@/utils/logger';

// ✅ A instância de wsManager agora vive dentro de app.ts
// ✅ Instância global do serviço de limpeza
let roomCleanupService: RoomCleanupService | null = null;

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

    // ✅ A criação do servidor e do WebSocketManager já aconteceu em app.ts
    // Agora só precisamos iniciar o servidor HTTP
    httpServer.listen(config.PORT, () => {
      logger.info(`🚀 Server running at http://localhost:${config.PORT}`);
      logger.info(`🐺 Werewolf Online ${config.SERVICE_TYPE} service started`);
      logger.info(`🔗 WebSocket available at ws://localhost:${config.PORT}${config.WS_BASE_PATH}`);
    });

    // 🧹 INICIALIZAR SERVIÇO DE LIMPEZA DE SALAS ÓRFÃS
    await initializeRoomCleanupService();

    setupGracefulShutdown(httpServer);

  } catch (error) {
    logger.error('Failed to start server', error instanceof Error ? error : new Error('Unknown server start error'));
    process.exit(1);
  }
}

/**
 * 🧹 Inicializa o serviço de limpeza de salas órfãs
 */
async function initializeRoomCleanupService(): Promise<void> {
  try {
    // Verificar se o WebSocketManager está disponível
    if (!(httpServer as any).wsManager) {
      logger.warn('❌ WebSocketManager not found, room cleanup service will not start');
      return;
    }

    const wsManager = (httpServer as any).wsManager;

    // Verificar se os managers estão disponíveis
    if (!wsManager.channelManager || !wsManager.connectionManager) {
      logger.warn('❌ Channel or Connection manager not found, room cleanup service will not start');
      return;
    }

    // Criar e iniciar o serviço de limpeza
    roomCleanupService = new RoomCleanupService(
      wsManager.channelManager,
      wsManager.connectionManager,
      wsManager.gameEngine  // ← ESTA LINHA ESTÁ FALTANDO!
    );

    // Iniciar com intervalo de 30 segundos
    roomCleanupService.start(15000);

    logger.info('✅ Room cleanup service initialized successfully');

  } catch (error) {
    logger.error('❌ Failed to initialize room cleanup service', error);
    // Não falhar o servidor por causa do serviço de limpeza
  }
}

function setupGracefulShutdown(server: any): void {
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    server.close(async () => {
      logger.info('HTTP server closed.');

      // 🧹 PARAR SERVIÇO DE LIMPEZA
      if (roomCleanupService) {
        try {
          roomCleanupService.stop();
          logger.info('Room cleanup service stopped.');
        } catch (error) {
          logger.warn('Error stopping room cleanup service', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      // ✅ Shutdown do WebSocketManager (se existir)
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

// 🔧 FUNÇÃO DE UTILIDADE PARA OBTER STATS DO CLEANUP (OPCIONAL)
export function getRoomCleanupStats() {
  return roomCleanupService?.getStats() || { isRunning: false, intervalMs: null };
}

// ✅ Iniciar servidor se for executado diretamente
if (require.main === module) {
  startServer();
}

export default httpServer;