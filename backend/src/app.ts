// 🐺 LOBISOMEM ONLINE - Express Application Setup
// ⚠ CRÍTICO: Preparado para separação REST/WebSocket na Fase 2
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from '@/config/environment';
import { checkDatabaseHealth } from '@/config/database';
import { checkRedisHealth } from '@/config/redis';
import { ServiceFactory } from '@/websocket/ServiceFactory';
// Import routes
import authRoutes from '@/routes/auth';
import roomRoutes from '@/routes/rooms';

//=====================================================================
// EXPRESS APPLICATION
//=====================================================================
const app = express();

//=====================================================================
// SECURITY MIDDLEWARE
//=====================================================================
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

//=====================================================================
// CORS CONFIGURATION
//=====================================================================
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://localhost:3000',
      'https://localhost:3001',
    ];

    if (config.IS_PRODUCTION) {
      // Add production origins here
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

//=====================================================================
// GENERAL MIDDLEWARE
//=====================================================================
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (config.IS_DEVELOPMENT) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

//=====================================================================
// HEALTH CHECK ENDPOINTS
//=====================================================================
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    const redisHealth = await checkRedisHealth();

    // Check WebSocket services health
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
    };

    // CORREÇÃO: Health check inteligente baseado na fase
    let hasUnhealthyService = false;

    if (config.DISTRIBUTED_MODE) {
      // Fase 2: Todos os serviços devem estar healthy
      hasUnhealthyService = Object.values(servicesHealth).some(
        (service: any) => service.status === 'unhealthy'
      );
    } else {
      // Fase 1: Só verificar serviços críticos (gameState)
      const criticalServices = ['gameState'];
      hasUnhealthyService = criticalServices.some(serviceName => {
        const service = servicesHealth[serviceName];
        return service && service.status === 'unhealthy';
      });
    }

    // Determinar status final
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
  });
});

app.get('/health/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// WebSocket-specific health endpoint
app.get('/health/websocket', async (req, res) => {
  try {
    const servicesHealth = await ServiceFactory.getServicesHealth();
    const servicesStats = ServiceFactory.getServicesStats();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: servicesHealth,
      stats: servicesStats,
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'WebSocket health check failed',
    });
  }
});

//=====================================================================
// API ROUTES
//=====================================================================
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// TODO: Add more routes as they are implemented
// app.use('/api/users', userRoutes);
// app.use('/api/games', gameRoutes);
// app.use('/api/leaderboard', leaderboardRoutes);

//=====================================================================
// ROOT ENDPOINT
//=====================================================================
app.get('/', (req, res) => {
  res.json({
    message: '🐺 Werewolf Online API',
    version: '1.0.0',
    phase: config.DISTRIBUTED_MODE ? 'Phase 2 (Distributed)' : 'Phase 1 (Monolithic)',
    service: config.SERVICE_TYPE,
    timestamp: new Date().toISOString(),
    websocket: {
      enabled: config.IS_MONOLITH || config.IS_GAME_SERVICE,
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

//=====================================================================
// ERROR HANDLING MIDDLEWARE
//=====================================================================
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
});

app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Express Error:', error);

  // Don't leak error details in production
  const isDev = config.IS_DEVELOPMENT;
  res.status(500).json({
    error: 'Internal Server Error',
    message: isDev ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString(),
    ...(isDev && { stack: error.stack }),
  });
});

export default app;