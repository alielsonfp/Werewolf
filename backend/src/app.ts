import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import http from 'http'; // ✅ NOVO: Importar http
import { config } from '@/config/environment';
import { checkDatabaseHealth } from '@/config/database';
import { checkRedisHealth } from '@/config/redis';
import { ServiceFactory } from '@/websocket/ServiceFactory';
import { WebSocketManager } from '@/websocket/WebSocketManager';
import { GameEngine } from '@/game/GameEngine';
import authRoutes from '@/routes/auth';
import roomRoutes from '@/routes/rooms';

const app = express();

// ✅ CONFIGURAÇÃO DE MIDDLEWARES (mantida igual)
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
    // Permitir requisições sem 'origin' (ex: Postman, apps mobile)
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

if (config.IS_DEVELOPMENT) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ✅✅✅ LÓGICA CRÍTICA MOVIDA PARA AQUI ✅✅✅
// Criar servidor HTTP e WebSocket ANTES das rotas
const httpServer = http.createServer(app);
let wsManager: WebSocketManager;

if (config.IS_MONOLITH || config.IS_GAME_SERVICE) {
  try {
    const gameStateService = ServiceFactory.getGameStateService();
    const eventBus = ServiceFactory.getEventBus();

    wsManager = new WebSocketManager(gameStateService, eventBus, config);
    wsManager.setupWebSocketServer(httpServer);

    // ✅ CORREÇÃO CRÍTICA: Injeção acontece ANTES das rotas
    app.locals.channelManager = wsManager.channelManager;
    console.log('✅ ChannelManager successfully injected into app.locals');

    // ✅ NOVO: Exportar wsManager para shutdown
    (httpServer as any).wsManager = wsManager;

    // ✅✅✅ CONFIGURAÇÃO DO GAMEENGINE BROADCASTER ✅✅✅
    // Configurar o broadcaster do GameEngine, se ele for a instância usada
    if (gameStateService instanceof GameEngine) {
      gameStateService.setBroadcaster(
        (roomId: string, type: string, data: any) => {
          wsManager.channelManager.broadcastToRoom(roomId, type, data);
        }
      );
      console.log('✅ GameEngine broadcaster configured successfully');
    }
    // ✅✅✅ FIM DA CONFIGURAÇÃO ✅✅✅

  } catch (error) {
    console.error('❌ Failed to initialize WebSocket:', error);
    throw error;
  }
} else {
  console.log('ℹ️ WebSocket not initialized (not MONOLITH or GAME_SERVICE)');
}
// ✅✅✅ FIM DA LÓGICA MOVIDA ✅✅✅

// ✅ ROTAS SÃO CARREGADAS DEPOIS (channelManager já existe)
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// ✅ HEALTH CHECKS - Versão híbrida: nova arquitetura + limpeza do colega
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    const redisHealth = await checkRedisHealth();
    
    // ✅ MANTÉM: Nova arquitetura precisa verificar services
    const servicesHealth = await ServiceFactory.getServicesHealth();
    const servicesStats = ServiceFactory.getServicesStats();

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
      stats: servicesStats,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      // ✅ NOVO: Adicionar status do WebSocket
      websocket: {
        initialized: !!wsManager,
        channelManagerInjected: !!app.locals.channelManager,
      },
    };

    let hasUnhealthyService = false;

    if (config.DISTRIBUTED_MODE) {
      hasUnhealthyService = Object.values(servicesHealth).some(
        (service: any) => service.status === 'unhealthy'
      );
    } else {
      const criticalServices = ['gameState'];
      hasUnhealthyService = criticalServices.some(serviceName => {
        const service = servicesHealth[serviceName];
        return service && service.status === 'unhealthy';
      });
    }

    const isSystemHealthy =
      dbHealth.status === 'healthy' &&
      (!config.SHOULD_USE_REDIS || redisHealth.status === 'healthy') &&
      !hasUnhealthyService;

    if (!isSystemHealthy) {
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

// ✅ CORREÇÃO: Removido o endpoint /health/websocket conforme sugerido pelo colega
// A saúde do WebSocket agora é verificada no endpoint principal /health

// ✅ ROOT ENDPOINT (mantido igual)
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
    endpoints: {
      health: '/health',
      websocketHealth: '/health/websocket',
      ready: '/health/ready',
      live: '/health/live',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        forgotPassword: 'POST /api/auth/forgot-password',
        resetPassword: 'POST /api/auth/reset-password',
        profile: 'GET /api/auth/profile',
        logout: 'POST /api/auth/logout',
      },
      rooms: {
        list: 'GET /api/rooms',
        create: 'POST /api/rooms',
        details: 'GET /api/rooms/:id',
        join: 'POST /api/rooms/:id/join',
        joinByCode: 'POST /api/rooms/join-by-code',
        delete: 'DELETE /api/rooms/:id',
      },
      websocket: {
        connect: `WS ${config.WS_BASE_PATH}`,
        events: [
          'join-room', 'leave-room', 'player-ready', 'start-game',
          'chat-message', 'game-action', 'vote', 'kick-player'
        ],
      },
    },
  });
});

// ✅ ERROR HANDLERS (mantidos iguais)
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

// ✅ EXPORTAR O HTTP SERVER (não mais o app)
export default httpServer;