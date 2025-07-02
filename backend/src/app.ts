// 🐺 LOBISOMEM ONLINE - Express Application Setup
// ⚠️ CRÍTICO: Preparado para separação REST/WebSocket na Fase 2

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from '@/config/environment';
import { checkDatabaseHealth } from '@/config/database';
import { checkRedisHealth } from '@/config/redis';

// =============================================================================
// EXPRESS APPLICATION
// =============================================================================
const app = express();

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================
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

// =============================================================================
// CORS CONFIGURATION
// =============================================================================
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

// =============================================================================
// GENERAL MIDDLEWARE
// =============================================================================
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (config.IS_DEVELOPMENT) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// =============================================================================
// HEALTH CHECK ENDPOINTS
// =============================================================================
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    const redisHealth = await checkRedisHealth();

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
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };

    // If any service is unhealthy, return 503
    if (dbHealth.status === 'unhealthy' ||
      (config.SHOULD_USE_REDIS && redisHealth.status === 'unhealthy')) {
      return res.status(503).json(health);
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

// =============================================================================
// API ROUTES (Will be added in next steps)
// =============================================================================
// TODO: Add routes in next development steps
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/rooms', roomRoutes);
// app.use('/api/games', gameRoutes);
// app.use('/api/leaderboard', leaderboardRoutes);

// =============================================================================
// ROOT ENDPOINT
// =============================================================================
app.get('/', (req, res) => {
  res.json({
    message: '🐺 Werewolf Online API',
    version: '1.0.0',
    phase: config.DISTRIBUTED_MODE ? 'Phase 2 (Distributed)' : 'Phase 1 (Monolithic)',
    service: config.SERVICE_TYPE,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      ready: '/health/ready',
      live: '/health/live',
      // TODO: Add API endpoints as they are implemented
    },
  });
});

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================
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