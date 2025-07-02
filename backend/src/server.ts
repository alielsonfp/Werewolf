// 🐺 LOBISOMEM ONLINE - Server Entry Point
// ⚠️ CRÍTICO: Inicialização preparada para migração Fase 1 → Fase 2

import http from 'http';
import app from './app';
import { config, validateConfig } from '@/config/environment';
import { connectDatabase, gracefulShutdown as shutdownDatabase } from '@/config/database';
import { connectRedis, gracefulShutdown as shutdownRedis } from '@/config/redis';

// Services will be imported and initialized as they are created
// import { WebSocketManager } from '@/websocket/WebSocketManager';
// import { ServiceFactory } from '@/services/infrastructure/ServiceFactory';

// =============================================================================
// SERVER INITIALIZATION
// =============================================================================
async function startServer(): Promise<void> {
  try {
    console.log('🐺 Starting Werewolf Online Server...');

    // Validate configuration
    validateConfig();

    // Connect to databases
    console.log('📡 Connecting to services...');
    await connectDatabase();
    await connectRedis();

    // Initialize services (Phase 1: All in one, Phase 2: Separate)
    console.log('🔧 Initializing services...');
    // TODO: Initialize services as they are created
    // const serviceFactory = new ServiceFactory();
    // const gameStateService = serviceFactory.getGameStateService();
    // const eventBus = serviceFactory.getEventBus();

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize WebSocket (Phase 1: Integrated, Phase 2: Separate service)
    if (config.IS_MONOLITH || config.IS_GAME_SERVICE) {
      console.log('🔌 Setting up WebSocket server...');
      // TODO: Initialize WebSocket manager
      // const wsManager = new WebSocketManager(gameStateService, eventBus, config);
      // wsManager.setupWebSocketServer(server);
    }

    // Service registration (Phase 2)
    if (config.DISTRIBUTED_MODE) {
      console.log('📋 Registering service...');
      // TODO: Register service in Redis
      // const serviceRegistry = serviceFactory.getServiceRegistry();
      // await serviceRegistry.registerService(config.SERVICE_ID, {
      //   type: config.SERVICE_TYPE,
      //   host: 'localhost',
      //   port: config.PORT,
      //   capabilities: config.IS_GAME_SERVICE ? ['werewolf-game'] : ['lobby'],
      //   maxRooms: config.IS_GAME_SERVICE ? 10 : 0,
      // });
    }

    // Start listening
    server.listen(config.PORT, () => {
      console.log('🚀 Server started successfully!');
      console.log(`   🌐 HTTP: http://localhost:${config.PORT}`);
      console.log(`   🔌 WebSocket: ws://localhost:${config.PORT}${config.WS_BASE_PATH}`);
      console.log(`   📊 Health: http://localhost:${config.PORT}/health`);
      console.log(`   🏗️  Architecture: ${config.DISTRIBUTED_MODE ? 'Distributed' : 'Monolithic'}`);
      console.log(`   🎯 Service Type: ${config.SERVICE_TYPE}`);
      console.log(`   💾 Storage: ${config.STORAGE_TYPE}`);
      console.log('');
      console.log('🎮 Ready to accept players!');
    });

    // Setup graceful shutdown
    setupGracefulShutdown(server);

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================
function setupGracefulShutdown(server: http.Server): void {
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

    try {
      // Stop accepting new connections
      server.close(() => {
        console.log('🔌 HTTP server closed');
      });

      // Unregister service (Phase 2)
      if (config.DISTRIBUTED_MODE) {
        console.log('📋 Unregistering service...');
        // TODO: Unregister from service registry
        // const serviceRegistry = ServiceFactory.getServiceRegistry();
        // await serviceRegistry.unregisterService(config.SERVICE_ID);
      }

      // Close WebSocket connections
      console.log('🔌 Closing WebSocket connections...');
      // TODO: Close WebSocket connections gracefully
      // wsManager.closeAllConnections();

      // Close database connections
      await shutdownDatabase();
      await shutdownRedis();

      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Listen for termination signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    shutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown('UNHANDLED_REJECTION');
  });
}

// =============================================================================
// DEVELOPMENT HELPERS
// =============================================================================
if (config.IS_DEVELOPMENT) {
  // Hot reload handling
  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => {
      console.log('🔄 Hot reload triggered');
    });
  }
}

// =============================================================================
// START SERVER
// =============================================================================
if (require.main === module) {
  startServer();
}

export default app;