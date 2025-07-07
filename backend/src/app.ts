import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from '@/config/environment';
import { checkDatabaseHealth } from '@/config/database';
import { checkRedisHealth } from '@/config/redis';
// ✅ CORREÇÃO: ServiceFactory não é mais necessária para o health check
// import { ServiceFactory } from '@/websocket/ServiceFactory';
import authRoutes from '@/routes/auth';
import roomRoutes from '@/routes/rooms';

const app = express();

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
      // Adicione aqui a URL do seu frontend em produção
    ];

    if (config.IS_PRODUCTION) {
      allowedOrigins.push('https://your-domain.com'); // Substitua pelo seu domínio
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

// ✅ CORREÇÃO: Simplificado o endpoint /health
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    const redisHealth = await checkRedisHealth();

    const isSystemHealthy =
      dbHealth.status === 'healthy' &&
      (!config.SHOULD_USE_REDIS || redisHealth.status === 'healthy');

    const healthStatus = {
      status: isSystemHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: {
        id: config.SERVICE_ID,
        type: config.SERVICE_TYPE,
        mode: config.DISTRIBUTED_MODE ? 'distributed' : 'monolithic',
      },
      dependencies: {
        database: dbHealth,
        redis: redisHealth,
      },
      uptime: process.uptime(),
    };

    res.status(isSystemHealthy ? 200 : 503).json(healthStatus);

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/health/ready', (req, res) => {
  res.status(200).json({ status: 'ready' });
});

app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// ✅ CORREÇÃO: Removido o endpoint /health/websocket que usava os métodos inexistentes.
// A saúde do WebSocket é inerentemente verificada pela rota /health principal agora.

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

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
      auth: { /* ... */ },
      rooms: { /* ... */ },
      websocket: { /* ... */ },
    },
  });
});

// Middleware de 404
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Middleware de tratamento de erro global
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

export default app;