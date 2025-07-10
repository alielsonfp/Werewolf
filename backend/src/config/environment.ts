// 🐺 LOBISOMEM ONLINE - Environment Configuration
// ⚠️ CRÍTICO: Configuration-driven para migração automática Fase 1 → Fase 2

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

export interface AppConfig {
  NODE_ENV: string;
  PORT: number;
  IS_PRODUCTION: boolean;
  IS_DEVELOPMENT: boolean;
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  DISTRIBUTED_MODE: boolean;
  STORAGE_TYPE: string;
  SERVICE_ID: string;
  SERVICE_TYPE: string;
  WS_BASE_PATH: string;
  WS_PORT: number;
  SHOULD_USE_REDIS: boolean;
  IS_GAME_SERVICE: boolean;
  IS_LOBBY_SERVICE: boolean;
  IS_MONOLITH: boolean;
}

const envSchema = z.object({
  // Core settings
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Authentication
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  // Architecture mode (CRÍTICO para migração)

  DISTRIBUTED_MODE: z.string().transform(val => val === 'true').default('false'),
  STORAGE_TYPE: z.enum(['memory', 'redis']).default('memory'),

  // Service discovery (Fase 2)
  SERVICE_ID: z.string().default('local-server'),
  SERVICE_TYPE: z.enum(['monolith', 'lobby', 'game']).default('monolith'),

  // WebSocket routing (Fase 2)
  WS_BASE_PATH: z.string().default('/ws'),
  WS_PORT: z.coerce.number().default(3001),

  // Game settings
  MIN_PLAYERS: z.coerce.number().default(6),
  MAX_PLAYERS: z.coerce.number().default(15),
  MAX_SPECTATORS: z.coerce.number().default(5),
  NIGHT_DURATION: z.coerce.number().default(60000),
  DAY_DURATION: z.coerce.number().default(120000),
  VOTING_DURATION: z.coerce.number().default(30000),

  // Email (opcional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
});

// =============================================================================
// VALIDATE AND EXPORT CONFIG
// =============================================================================
const envVars = envSchema.parse(process.env);

export const config = {
  // Core settings
  NODE_ENV: envVars.NODE_ENV,
  PORT: envVars.PORT,
  IS_PRODUCTION: envVars.NODE_ENV === 'production',
  IS_DEVELOPMENT: envVars.NODE_ENV === 'development',

  // Database
  DATABASE_URL: envVars.DATABASE_URL,
  REDIS_URL: envVars.REDIS_URL,

  // Authentication
  JWT_SECRET: envVars.JWT_SECRET,
  JWT_EXPIRES_IN: envVars.JWT_EXPIRES_IN,

  // Architecture mode (CRÍTICO)
  DISTRIBUTED_MODE: envVars.DISTRIBUTED_MODE,
  STORAGE_TYPE: envVars.STORAGE_TYPE,

  // Service discovery (Fase 2)
  SERVICE_ID: envVars.SERVICE_ID,
  SERVICE_TYPE: envVars.SERVICE_TYPE,

  // WebSocket routing (Fase 2)
  WS_BASE_PATH: envVars.WS_BASE_PATH,
  WS_PORT: envVars.WS_PORT,

  // Game settings
  GAME: {
    MIN_PLAYERS: envVars.MIN_PLAYERS,
    MAX_PLAYERS: envVars.MAX_PLAYERS,
    MAX_SPECTATORS: envVars.MAX_SPECTATORS,
    NIGHT_DURATION: envVars.NIGHT_DURATION,
    DAY_DURATION: envVars.DAY_DURATION,
    VOTING_DURATION: envVars.VOTING_DURATION,
  },

  // Email
  EMAIL: {
    SMTP_HOST: envVars.SMTP_HOST,
    SMTP_PORT: envVars.SMTP_PORT,
    SMTP_USER: envVars.SMTP_USER,
    SMTP_PASS: envVars.SMTP_PASS,
    ENABLED: !!(envVars.SMTP_HOST && envVars.SMTP_USER && envVars.SMTP_PASS),
  },

  // Derived flags
  SHOULD_USE_REDIS: envVars.DISTRIBUTED_MODE || envVars.STORAGE_TYPE === 'redis',
  IS_GAME_SERVICE: envVars.SERVICE_TYPE === 'game',
  IS_LOBBY_SERVICE: envVars.SERVICE_TYPE === 'lobby',
  IS_MONOLITH: envVars.SERVICE_TYPE === 'monolith',
} as const;

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================
export type Config = typeof config;
export type StorageType = 'memory' | 'redis';
export type ServiceType = 'monolith' | 'lobby' | 'game';

// =============================================================================
// VALIDATION HELPERS
// =============================================================================
export function validateConfig(): void {
  console.log('🔧 Configuration loaded:');
  console.log(`   Mode: ${config.NODE_ENV}`);
  console.log(`   Architecture: ${config.DISTRIBUTED_MODE ? 'Distributed' : 'Monolithic'}`);
  console.log(`   Service Type: ${config.SERVICE_TYPE}`);
  console.log(`   Storage: ${config.STORAGE_TYPE}`);
  console.log(`   Port: ${config.PORT}`);

  if (config.IS_PRODUCTION && config.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production') {
    throw new Error('❌ JWT_SECRET must be changed in production!');
  }

  if (config.DISTRIBUTED_MODE && !config.SHOULD_USE_REDIS) {
    throw new Error('❌ DISTRIBUTED_MODE requires Redis storage!');
  }
}