// 🐺 LOBISOMEM ONLINE - App Entry Point (CORRIGIDO)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import http from 'http';
import { config } from '@/config/environment';
import { checkDatabaseHealth } from '@/config/database';
import { checkRedisHealth } from '@/config/redis';
import { ServiceFactory } from '@/websocket/ServiceFactory';
import { WebSocketManager } from '@/websocket/WebSocketManager';
import { GameEngine } from '@/game/GameEngine';
import authRoutes from '@/routes/auth';
import roomRoutes from '@/routes/rooms';

const app = express();

// MIDDLEWARES
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://localhost:3000',
      'https://localhost:3001',
    ];
    if (config.IS_PRODUCTION) {
      allowedOrigins.push('https://your-domain.com');
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-Time',
    'X-Request-ID'
  ],
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(config.IS_DEVELOPMENT ? morgan('dev') : morgan('combined'));

// CRIAÇÃO DO SERVIDOR HTTP E WEBSOCKET
const httpServer = http.createServer(app);
let wsManager: WebSocketManager;

if (config.IS_MONOLITH || config.IS_GAME_SERVICE) {
  try {
    const gameStateService = ServiceFactory.getGameStateService();
    const eventBus = ServiceFactory.getEventBus();

    wsManager = new WebSocketManager(gameStateService, eventBus, config as any); // Usando 'as any' para contornar complexidade de tipo na config
    wsManager.setupWebSocketServer(httpServer);

    // Injeção de dependência para os controllers HTTP
    app.locals.channelManager = wsManager.channelManager;
    console.log('✅ ChannelManager successfully injected into app.locals');

    (httpServer as any).wsManager = wsManager;

    if (gameStateService instanceof GameEngine) {
      gameStateService.setBroadcaster(
        (roomId: string, type: string, data: any) => {
          wsManager.channelManager.broadcastToRoom(roomId, type, data);
        }
      );
      console.log('✅ GameEngine broadcaster configured successfully');
    }

  } catch (error) {
    console.error('❌ Failed to initialize WebSocket:', error);
    throw error;
  }
} else {
  console.log('ℹ️ WebSocket not initialized (not MONOLITH or GAME_SERVICE)');
}

// ROTAS
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// HEALTH CHECKS
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    const redisHealth = await checkRedisHealth();
    
    // CORREÇÃO: Chamar o método 'healthCheck' individual de cada serviço, pois 'getServicesHealth' não existe.
    // Usamos o operador '?.' (optional chaining) porque healthCheck é opcional na interface.
    const servicesHealth = {
        gameState: await ServiceFactory.getGameStateService().healthCheck?.(),
        eventBus: await ServiceFactory.getEventBus().healthCheck?.(),
        serviceRegistry: await ServiceFactory.getServiceRegistry().healthCheck?.()
    };
    
    // CORREÇÃO: O método 'getServicesStats' não existe. As estatísticas mais relevantes estão no wsManager.
    const wsStats = wsManager ? wsManager.getStats() : 'Not Initialized';

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: {
        id: config.SERVICE_ID,
        type: config.SERVICE_TYPE,
        mode: config.DISTRIBUTED_MODE ? 'distributed' : 'monolithic',
      },
      database: dbHealth,
      redis: redisHealth,
      services: servicesHealth,
      stats: {
          websocket: wsStats,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
      },
      websocket: {
        initialized: !!wsManager,
        channelManagerInjected: !!app.locals.channelManager,
      },
    };

    const hasUnhealthyService = Object.values(servicesHealth).some(
      (service) => service && service.status === 'unhealthy'
    );

    const isSystemHealthy =
      dbHealth.status === 'healthy' &&
      (!config.SHOULD_USE_REDIS || redisHealth.status === 'healthy') &&
      !hasUnhealthyService;

    if (!isSystemHealthy) {
        health.status = 'unhealthy';
        res.status(503).json(health);
        return;
    }

    res.json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/health/ready', (req, res) => {
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    service: config.SERVICE_ID,
    websocket: !!wsManager,
  });
});

app.get('/health/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ROOT ENDPOINT
app.get('/', (req, res) => {
  res.json({
    message: '🐺 Werewolf Online API',
    version: '1.0.0',
    phase: config.DISTRIBUTED_MODE ? 'Phase 2 (Distributed)' : 'Phase 1 (Monolithic)',
    service: config.SERVICE_TYPE,
    timestamp: new Date().toISOString(),
    websocket: {
      enabled: config.IS_MONOLITH || config.IS_GAME_SERVICE,
      initialized: !!wsManager,
      path: config.WS_BASE_PATH,
      url: `ws://localhost:${config.PORT}${config.WS_BASE_PATH}`,
    },
  });
});

// ERROR HANDLERS
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
});

app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Express Error:', error);

  const isDev = config.IS_DEVELOPMENT;
  res.status(500).json({
    error: 'Internal Server Error',
    message: isDev ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString(),
    ...(isDev && { stack: error.stack }),
  });
});

// EXPORTAR O HTTP SERVER
export default httpServer;